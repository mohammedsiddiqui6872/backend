const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');
const RecipeIngredient = require('../models/RecipeIngredient');
const mongoose = require('mongoose');

class InventoryService {
  /**
   * Stock Receiving - Complete receiving process with quality checks
   */
  async receiveStock(tenantId, purchaseOrderId, receivingData, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { items, deliveryNote, temperature, photos, notes } = receivingData;
      
      // Get purchase order
      const purchaseOrder = await PurchaseOrder.findOne({
        _id: purchaseOrderId,
        tenantId
      }).session(session);
      
      if (!purchaseOrder) {
        throw new Error('Purchase order not found');
      }
      
      const movements = [];
      const updatedItems = [];
      
      for (const receivedItem of items) {
        const { 
          inventoryItemId, 
          quantity, 
          batchNumber, 
          expiryDate, 
          qualityCheck,
          location,
          temperature: itemTemp 
        } = receivedItem;
        
        // Find inventory item
        const inventoryItem = await InventoryItem.findOne({
          _id: inventoryItemId,
          tenantId
        }).session(session);
        
        if (!inventoryItem) {
          throw new Error(`Inventory item ${inventoryItemId} not found`);
        }
        
        // Quality check
        if (qualityCheck) {
          if (!qualityCheck.passed) {
            // Create quarantine batch
            inventoryItem.batches.push({
              batchNumber,
              expiryDate,
              quantity,
              location: location || 'quarantine',
              cost: receivedItem.unitCost,
              supplier: purchaseOrder.supplier,
              receivedDate: new Date(),
              qualityCheckPassed: false,
              quarantined: true
            });
            
            continue; // Skip stock movement for quarantined items
          }
        }
        
        // Add batch to inventory
        if (inventoryItem.batchTracking) {
          inventoryItem.batches.push({
            batchNumber: batchNumber || `RCV-${Date.now()}`,
            expiryDate,
            manufacturingDate: receivedItem.manufacturingDate,
            quantity,
            location: location || 'main',
            cost: receivedItem.unitCost,
            supplier: purchaseOrder.supplier,
            receivedDate: new Date(),
            qualityCheckPassed: true,
            quarantined: false
          });
        }
        
        // Update stock levels
        const stockLocation = inventoryItem.stockLevels.find(sl => 
          sl.location === (location || 'main')
        );
        
        if (stockLocation) {
          stockLocation.quantity += quantity;
          stockLocation.availableQuantity += quantity;
        } else {
          inventoryItem.stockLevels.push({
            location: location || 'main',
            quantity,
            availableQuantity: quantity,
            reservedQuantity: 0
          });
        }
        
        inventoryItem.totalQuantity += quantity;
        inventoryItem.totalAvailable += quantity;
        inventoryItem.lastPurchaseCost = receivedItem.unitCost;
        
        await inventoryItem.save({ session });
        
        // Create stock movement
        const movement = new StockMovement({
          tenantId,
          type: 'PURCHASE',
          inventoryItem: inventoryItemId,
          itemName: inventoryItem.name,
          sku: inventoryItem.sku,
          quantity,
          unit: inventoryItem.baseUnit,
          toLocation: {
            location: location || 'main'
          },
          batchNumber,
          expiryDate,
          unitCost: receivedItem.unitCost,
          totalCost: quantity * receivedItem.unitCost,
          reference: {
            type: 'PURCHASE_ORDER',
            id: purchaseOrderId,
            number: purchaseOrder.orderNumber
          },
          purchaseOrder: purchaseOrderId,
          performedBy: userId,
          notes: `Received from PO ${purchaseOrder.orderNumber}`
        });
        
        await movement.save({ session });
        movements.push(movement);
        
        // Update PO item
        const poItem = purchaseOrder.items.find(item => 
          item.inventoryItem.toString() === inventoryItemId
        );
        
        if (poItem) {
          poItem.receivedQuantity = (poItem.receivedQuantity || 0) + quantity;
          poItem.receivedBatches.push({
            batchNumber,
            quantity,
            expiryDate,
            receivedDate: new Date(),
            receivedBy: userId
          });
          
          if (qualityCheck) {
            poItem.qualityCheck = {
              required: true,
              passed: qualityCheck.passed,
              checkedBy: userId,
              checkedDate: new Date(),
              notes: qualityCheck.notes,
              temperature: itemTemp,
              appearance: qualityCheck.appearance,
              packaging: qualityCheck.packaging
            };
          }
          
          poItem.status = poItem.receivedQuantity >= poItem.quantity ? 'RECEIVED' : 'PARTIAL';
        }
        
        updatedItems.push(inventoryItem);
      }
      
      // Update purchase order
      purchaseOrder.deliveries.push({
        actualDate: new Date(),
        deliveryNote,
        temperature: { vehicle: temperature },
        receivedBy: userId,
        photos
      });
      
      purchaseOrder.receivingNotes = notes;
      purchaseOrder.updateReceivingStatus();
      
      await purchaseOrder.save({ session });
      
      await session.commitTransaction();
      
      return {
        success: true,
        movements,
        purchaseOrder,
        updatedItems
      };
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Automatic Reordering - Check and create POs for items below reorder point
   */
  async checkAndCreateReorders(tenantId) {
    const itemsToReorder = await InventoryItem.find({
      tenantId,
      isActive: true,
      totalAvailable: { $lte: '$reorderPoint' }
    }).populate('suppliers.supplier');
    
    // Group items by preferred supplier
    const supplierGroups = {};
    
    for (const item of itemsToReorder) {
      const preferredSupplier = item.suppliers.find(s => s.preferredSupplier);
      const supplierId = preferredSupplier ? 
        preferredSupplier.supplier._id.toString() : 
        item.suppliers[0]?.supplier._id.toString();
      
      if (!supplierId) continue;
      
      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          supplier: preferredSupplier?.supplier || item.suppliers[0].supplier,
          items: []
        };
      }
      
      // Calculate order quantity (EOQ or reorder quantity)
      const orderQty = item.economicOrderQuantity || 
                       item.reorderQuantity || 
                       (item.reorderPoint * 2);
      
      supplierGroups[supplierId].items.push({
        item,
        quantity: Math.max(orderQty, preferredSupplier?.moq || 1),
        supplierInfo: preferredSupplier || item.suppliers[0]
      });
    }
    
    // Create purchase orders
    const purchaseOrders = [];
    
    for (const [supplierId, group] of Object.entries(supplierGroups)) {
      const orderNumber = await PurchaseOrder.generateOrderNumber(tenantId);
      
      const items = group.items.map(({ item, quantity, supplierInfo }) => ({
        inventoryItem: item._id,
        supplierSKU: supplierInfo.supplierSKU,
        description: item.name,
        quantity,
        unit: item.baseUnit,
        unitPrice: supplierInfo.cost,
        discount: 0,
        tax: 0
      }));
      
      const subtotal = items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0
      );
      
      const purchaseOrder = new PurchaseOrder({
        tenantId,
        orderNumber,
        type: 'REGULAR',
        priority: 'NORMAL',
        supplier: supplierId,
        supplierName: group.supplier.name,
        items,
        subtotal,
        totalAmount: subtotal,
        source: 'AUTO_REORDER',
        status: 'DRAFT',
        createdBy: 'system',
        requiredDate: new Date(Date.now() + (group.supplier.leadTimeDays || 1) * 24 * 60 * 60 * 1000)
      });
      
      await purchaseOrder.save();
      purchaseOrders.push(purchaseOrder);
    }
    
    return purchaseOrders;
  }
  
  /**
   * Waste Management - Track and analyze waste
   */
  async recordWaste(tenantId, wasteData, userId) {
    const { items, type, reason, preventionMeasures, notes } = wasteData;
    const movements = [];
    
    for (const wasteItem of items) {
      const { inventoryItemId, quantity, batchNumber, location } = wasteItem;
      
      const inventoryItem = await InventoryItem.findOne({
        _id: inventoryItemId,
        tenantId
      });
      
      if (!inventoryItem) {
        throw new Error(`Inventory item ${inventoryItemId} not found`);
      }
      
      // Update waste percentage
      const totalUsed = await StockMovement.aggregate([
        {
          $match: {
            tenantId,
            inventoryItem: inventoryItem._id,
            type: { $in: ['SALE', 'PRODUCTION'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$quantity' } }
          }
        }
      ]);
      
      const totalWaste = await StockMovement.aggregate([
        {
          $match: {
            tenantId,
            inventoryItem: inventoryItem._id,
            type: 'WASTE'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$quantity' } }
          }
        }
      ]);
      
      const usedQty = totalUsed[0]?.total || 0;
      const wasteQty = (totalWaste[0]?.total || 0) + quantity;
      
      if (usedQty > 0) {
        inventoryItem.wastePercentage = (wasteQty / (usedQty + wasteQty)) * 100;
      }
      
      // Create movement
      const movement = new StockMovement({
        tenantId,
        type: type || 'WASTE',
        inventoryItem: inventoryItemId,
        itemName: inventoryItem.name,
        sku: inventoryItem.sku,
        quantity,
        unit: inventoryItem.baseUnit,
        fromLocation: { location },
        batchNumber,
        unitCost: inventoryItem.currentCost,
        reason,
        wasteCategory: type === 'WASTE' ? reason : undefined,
        preventionMeasures,
        notes,
        performedBy: userId
      });
      
      await movement.save();
      movements.push(movement);
      
      // Update stock
      inventoryItem.totalQuantity -= quantity;
      inventoryItem.totalAvailable -= quantity;
      
      if (location) {
        const stockLevel = inventoryItem.stockLevels.find(sl => sl.location === location);
        if (stockLevel) {
          stockLevel.quantity -= quantity;
          stockLevel.availableQuantity -= quantity;
        }
      }
      
      await inventoryItem.save();
    }
    
    return movements;
  }
  
  /**
   * Stock Transfer - Transfer between locations
   */
  async transferStock(tenantId, transferData, userId) {
    const { inventoryItemId, quantity, fromLocation, toLocation, notes } = transferData;
    
    const inventoryItem = await InventoryItem.findOne({
      _id: inventoryItemId,
      tenantId
    });
    
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }
    
    // Check available stock in source location
    const fromStock = inventoryItem.stockLevels.find(sl => 
      sl.location === fromLocation.location
    );
    
    if (!fromStock || fromStock.availableQuantity < quantity) {
      throw new Error('Insufficient stock in source location');
    }
    
    // Update stock levels
    fromStock.quantity -= quantity;
    fromStock.availableQuantity -= quantity;
    
    let toStock = inventoryItem.stockLevels.find(sl => 
      sl.location === toLocation.location
    );
    
    if (toStock) {
      toStock.quantity += quantity;
      toStock.availableQuantity += quantity;
    } else {
      inventoryItem.stockLevels.push({
        location: toLocation.location,
        zone: toLocation.zone,
        bin: toLocation.bin,
        quantity,
        availableQuantity: quantity,
        reservedQuantity: 0
      });
    }
    
    await inventoryItem.save();
    
    // Create movement record
    const movement = new StockMovement({
      tenantId,
      type: 'TRANSFER',
      inventoryItem: inventoryItemId,
      itemName: inventoryItem.name,
      sku: inventoryItem.sku,
      quantity,
      unit: inventoryItem.baseUnit,
      fromLocation,
      toLocation,
      unitCost: inventoryItem.currentCost,
      notes,
      performedBy: userId
    });
    
    await movement.save();
    
    return movement;
  }
  
  /**
   * Cycle Counting - Perform cycle count with variance analysis
   */
  async performCycleCount(tenantId, countData, userId) {
    const { inventoryItemId, countedQuantity, location, notes } = countData;
    
    const inventoryItem = await InventoryItem.findOne({
      _id: inventoryItemId,
      tenantId
    });
    
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }
    
    const systemQuantity = location ? 
      inventoryItem.stockLevels.find(sl => sl.location === location)?.quantity || 0 :
      inventoryItem.totalQuantity;
    
    const variance = countedQuantity - systemQuantity;
    const variancePercentage = systemQuantity > 0 ? 
      (Math.abs(variance) / systemQuantity) * 100 : 0;
    
    // Create adjustment if variance exists
    if (variance !== 0) {
      const movement = new StockMovement({
        tenantId,
        type: 'CYCLE_COUNT',
        inventoryItem: inventoryItemId,
        itemName: inventoryItem.name,
        sku: inventoryItem.sku,
        quantity: variance,
        unit: inventoryItem.baseUnit,
        stockBefore: systemQuantity,
        stockAfter: countedQuantity,
        toLocation: location ? { location } : undefined,
        unitCost: inventoryItem.currentCost,
        reason: 'COUNTING_ERROR',
        notes: `Cycle count variance: ${variance} (${variancePercentage.toFixed(2)}%). ${notes || ''}`,
        performedBy: userId,
        requiresApproval: Math.abs(variancePercentage) > 5,
        approvalStatus: Math.abs(variancePercentage) > 5 ? 'PENDING' : 'APPROVED'
      });
      
      await movement.save();
      
      // Update inventory if auto-approved
      if (movement.approvalStatus === 'APPROVED') {
        if (location) {
          const stockLevel = inventoryItem.stockLevels.find(sl => sl.location === location);
          if (stockLevel) {
            stockLevel.quantity = countedQuantity;
            stockLevel.availableQuantity = countedQuantity - stockLevel.reservedQuantity;
          }
        } else {
          inventoryItem.totalQuantity = countedQuantity;
          inventoryItem.totalAvailable = countedQuantity - inventoryItem.totalReserved;
        }
        
        inventoryItem.lastCountDate = new Date();
        inventoryItem.lastCountVariance = variance;
        
        await inventoryItem.save();
      }
      
      return {
        movement,
        variance,
        variancePercentage,
        requiresApproval: movement.requiresApproval
      };
    }
    
    // No variance - just update count date
    inventoryItem.lastCountDate = new Date();
    inventoryItem.lastCountVariance = 0;
    await inventoryItem.save();
    
    return {
      variance: 0,
      variancePercentage: 0,
      requiresApproval: false
    };
  }
  
  /**
   * Get Inventory Valuation - Real-time inventory value
   */
  async getInventoryValuation(tenantId, options = {}) {
    const { category, location, date } = options;
    
    const match = { tenantId, isActive: true };
    if (category) match.category = category;
    
    const items = await InventoryItem.find(match);
    
    let totalValue = 0;
    const categoryValues = {};
    const locationValues = {};
    const details = [];
    
    for (const item of items) {
      let itemValue = 0;
      
      if (location) {
        const stockLevel = item.stockLevels.find(sl => sl.location === location);
        if (stockLevel) {
          itemValue = stockLevel.quantity * item.currentCost;
        }
      } else {
        itemValue = item.totalQuantity * item.currentCost;
      }
      
      totalValue += itemValue;
      
      // Category breakdown
      if (!categoryValues[item.category]) {
        categoryValues[item.category] = 0;
      }
      categoryValues[item.category] += itemValue;
      
      // Location breakdown
      for (const stockLevel of item.stockLevels) {
        if (!locationValues[stockLevel.location]) {
          locationValues[stockLevel.location] = 0;
        }
        locationValues[stockLevel.location] += stockLevel.quantity * item.currentCost;
      }
      
      details.push({
        itemId: item._id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: location ? 
          item.stockLevels.find(sl => sl.location === location)?.quantity || 0 :
          item.totalQuantity,
        unitCost: item.currentCost,
        value: itemValue,
        turnoverRate: item.turnoverRate
      });
    }
    
    return {
      totalValue,
      byCategory: categoryValues,
      byLocation: locationValues,
      itemCount: details.length,
      details: details.sort((a, b) => b.value - a.value)
    };
  }
  
  /**
   * Check Expiring Items - Get items expiring soon
   */
  async getExpiringItems(tenantId, daysAhead = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);
    
    const items = await InventoryItem.find({
      tenantId,
      batchTracking: true,
      'batches.expiryDate': { $lte: expiryDate }
    });
    
    const expiringBatches = [];
    
    for (const item of items) {
      const expiring = item.getExpiringBatches(daysAhead);
      
      for (const batch of expiring) {
        const daysUntilExpiry = Math.ceil(
          (batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
        );
        
        expiringBatches.push({
          item: {
            id: item._id,
            name: item.name,
            sku: item.sku
          },
          batch: batch.batchNumber,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate,
          daysUntilExpiry,
          value: batch.quantity * item.currentCost,
          location: batch.location,
          action: daysUntilExpiry <= 0 ? 'DISPOSE' : 
                  daysUntilExpiry <= 3 ? 'USE_IMMEDIATELY' : 'MONITOR'
        });
      }
    }
    
    return expiringBatches.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }
  
  /**
   * Calculate EOQ - Economic Order Quantity
   */
  async calculateEOQ(tenantId, inventoryItemId, period = 365) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Get demand data
    const movements = await StockMovement.aggregate([
      {
        $match: {
          tenantId,
          inventoryItem: mongoose.Types.ObjectId(inventoryItemId),
          type: { $in: ['SALE', 'PRODUCTION'] },
          performedDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalDemand: { $sum: { $abs: '$quantity' } },
          orderCount: { $sum: 1 }
        }
      }
    ]);
    
    if (!movements[0]) {
      return null;
    }
    
    const annualDemand = (movements[0].totalDemand / period) * 365;
    
    const inventoryItem = await InventoryItem.findOne({
      _id: inventoryItemId,
      tenantId
    });
    
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }
    
    // Estimate ordering cost (can be configured)
    const orderingCost = 50; // Cost per order
    const holdingCostRate = 0.25; // 25% of item cost
    const holdingCost = inventoryItem.currentCost * holdingCostRate;
    
    // EOQ = sqrt((2 * D * S) / H)
    // D = Annual demand
    // S = Ordering cost per order
    // H = Holding cost per unit per year
    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
    
    // Calculate reorder point
    const dailyDemand = annualDemand / 365;
    const leadTime = inventoryItem.suppliers[0]?.leadTimeDays || 1;
    const reorderPoint = dailyDemand * leadTime + (inventoryItem.safetyStock || 0);
    
    // Update item with calculated values
    inventoryItem.economicOrderQuantity = Math.ceil(eoq);
    inventoryItem.reorderPoint = Math.ceil(reorderPoint);
    await inventoryItem.save();
    
    return {
      eoq: Math.ceil(eoq),
      reorderPoint: Math.ceil(reorderPoint),
      annualDemand,
      dailyDemand,
      orderingCost,
      holdingCost,
      optimalOrdersPerYear: annualDemand / eoq,
      totalAnnualCost: (annualDemand / eoq) * orderingCost + (eoq / 2) * holdingCost
    };
  }
  
  /**
   * ABC Analysis - Classify items by value
   */
  async performABCAnalysis(tenantId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    // Get all items with their movement value
    const analysis = await StockMovement.aggregate([
      {
        $match: {
          tenantId,
          type: { $in: ['SALE', 'PRODUCTION'] },
          performedDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$inventoryItem',
          totalQuantity: { $sum: { $abs: '$quantity' } },
          totalValue: { $sum: '$totalCost' },
          movementCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'inventoryitems',
          localField: '_id',
          foreignField: '_id',
          as: 'item'
        }
      },
      {
        $unwind: '$item'
      },
      {
        $project: {
          itemId: '$_id',
          name: '$item.name',
          sku: '$item.sku',
          category: '$item.category',
          totalQuantity: 1,
          totalValue: 1,
          movementCount: 1,
          currentStock: '$item.totalQuantity',
          stockValue: { $multiply: ['$item.totalQuantity', '$item.currentCost'] }
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ]);
    
    const totalValue = analysis.reduce((sum, item) => sum + item.totalValue, 0);
    let cumulativeValue = 0;
    
    const classified = analysis.map(item => {
      cumulativeValue += item.totalValue;
      const percentage = (cumulativeValue / totalValue) * 100;
      
      let classification;
      if (percentage <= 80) {
        classification = 'A'; // 80% of value
      } else if (percentage <= 95) {
        classification = 'B'; // 15% of value
      } else {
        classification = 'C'; // 5% of value
      }
      
      return {
        ...item,
        classification,
        valuePercentage: (item.totalValue / totalValue) * 100,
        cumulativePercentage: percentage
      };
    });
    
    // Summary
    const summary = {
      A: classified.filter(i => i.classification === 'A'),
      B: classified.filter(i => i.classification === 'B'),
      C: classified.filter(i => i.classification === 'C')
    };
    
    return {
      items: classified,
      summary: {
        A: {
          count: summary.A.length,
          percentage: (summary.A.length / classified.length) * 100,
          value: summary.A.reduce((sum, i) => sum + i.totalValue, 0),
          recommendation: 'Tight control, frequent reviews, accurate records'
        },
        B: {
          count: summary.B.length,
          percentage: (summary.B.length / classified.length) * 100,
          value: summary.B.reduce((sum, i) => sum + i.totalValue, 0),
          recommendation: 'Moderate control, periodic reviews'
        },
        C: {
          count: summary.C.length,
          percentage: (summary.C.length / classified.length) * 100,
          value: summary.C.reduce((sum, i) => sum + i.totalValue, 0),
          recommendation: 'Simple control, infrequent reviews'
        }
      },
      totalValue
    };
  }
  
  /**
   * Stock Turnover Analysis
   */
  async analyzeStockTurnover(tenantId, period = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    const items = await InventoryItem.find({ tenantId, isActive: true });
    const analysis = [];
    
    for (const item of items) {
      // Get usage
      const usage = await StockMovement.aggregate([
        {
          $match: {
            tenantId,
            inventoryItem: item._id,
            type: { $in: ['SALE', 'PRODUCTION'] },
            performedDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalUsed: { $sum: { $abs: '$quantity' } }
          }
        }
      ]);
      
      const totalUsed = usage[0]?.totalUsed || 0;
      const averageStock = item.totalQuantity; // Simplified - should track over time
      const turnoverRate = averageStock > 0 ? (totalUsed / averageStock) * (365 / period) : 0;
      const daysOnHand = turnoverRate > 0 ? 365 / turnoverRate : 999;
      
      analysis.push({
        item: {
          id: item._id,
          name: item.name,
          sku: item.sku,
          category: item.category
        },
        currentStock: item.totalQuantity,
        stockValue: item.totalQuantity * item.currentCost,
        usage: totalUsed,
        turnoverRate: turnoverRate.toFixed(2),
        daysOnHand: Math.round(daysOnHand),
        status: 
          daysOnHand > 90 ? 'SLOW_MOVING' :
          daysOnHand > 30 ? 'NORMAL' :
          daysOnHand > 7 ? 'FAST_MOVING' :
          'VERY_FAST_MOVING',
        recommendation:
          daysOnHand > 90 ? 'Reduce stock levels or discontinue' :
          daysOnHand > 30 ? 'Monitor and optimize' :
          daysOnHand > 7 ? 'Ensure adequate stock' :
          'Increase safety stock'
      });
      
      // Update item
      item.turnoverRate = turnoverRate;
      await item.save();
    }
    
    return analysis.sort((a, b) => b.turnoverRate - a.turnoverRate);
  }
  
  // Backward compatibility methods from original service
  async deductForOrder(orderId, items, userId) {
    const deductions = [];
    const insufficientStock = [];
    
    try {
      // Check availability first
      for (const item of items) {
        if (!item.menuItem) continue;
        
        const recipe = await RecipeIngredient.find({ menuItem: item.menuItem })
          .populate('ingredient');
        
        for (const recipeItem of recipe) {
          const inventory = await Inventory.findOne({ 
            ingredient: recipeItem.ingredient._id 
          });
          
          const requiredQuantity = recipeItem.quantity * item.quantity;
          
          if (!inventory || inventory.currentStock < requiredQuantity) {
            insufficientStock.push({
              ingredient: recipeItem.ingredient.name,
              required: requiredQuantity,
              available: inventory ? inventory.currentStock : 0,
              unit: recipeItem.unit
            });
          }
        }
      }
      
      // If any ingredient is insufficient, throw error
      if (insufficientStock.length > 0) {
        const error = new Error('Insufficient inventory');
        error.details = insufficientStock;
        throw error;
      }
      
      // Deduct inventory
      for (const item of items) {
        if (!item.menuItem) continue;
        
        const recipe = await RecipeIngredient.find({ menuItem: item.menuItem });
        
        for (const recipeItem of recipe) {
          const inventory = await Inventory.findOne({ 
            ingredient: recipeItem.ingredient 
          });
          
          if (inventory) {
            const quantity = recipeItem.quantity * item.quantity;
            await inventory.removeStock(
              quantity, 
              `Order #${orderId}`, 
              userId, 
              orderId
            );
            
            deductions.push({
              ingredient: recipeItem.ingredient,
              quantity,
              newStock: inventory.currentStock
            });
          }
        }
      }
      
      return {
        success: true,
        deductions
      };
    } catch (error) {
      // Rollback if needed
      if (deductions.length > 0 && error.message !== 'Insufficient inventory') {
        // Revert deductions
        for (const deduction of deductions) {
          const inventory = await Inventory.findOne({ 
            ingredient: deduction.ingredient 
          });
          if (inventory) {
            await inventory.addStock(
              deduction.quantity,
              null,
              userId
            );
          }
        }
      }
      
      throw error;
    }
  }
  
  async returnForOrder(orderId, items, userId) {
    const returns = [];
    
    for (const item of items) {
      if (!item.menuItem) continue;
      
      const recipe = await RecipeIngredient.find({ menuItem: item.menuItem });
      
      for (const recipeItem of recipe) {
        const inventory = await Inventory.findOne({ 
          ingredient: recipeItem.ingredient 
        });
        
        if (inventory) {
          const quantity = recipeItem.quantity * item.quantity;
          
          inventory.currentStock += quantity;
          inventory.movements.push({
            type: 'return',
            quantity,
            reason: `Order #${orderId} cancelled`,
            performedBy: userId,
            relatedOrder: orderId
          });
          
          await inventory.save();
          
          returns.push({
            ingredient: recipeItem.ingredient,
            quantity,
            newStock: inventory.currentStock
          });
        }
      }
    }
    
    return {
      success: true,
      returns
    };
  }
  
  async getMenuItemAvailability(menuItemIds) {
    const availability = {};
    
    for (const menuItemId of menuItemIds) {
      const canMake = await RecipeIngredient.checkAvailability(menuItemId);
      availability[menuItemId] = canMake;
    }
    
    return availability;
  }
  
  async getLowStockAlerts() {
    const lowStock = await Inventory.getLowStockItems();
    const expiring = await Inventory.getExpiringItems();
    
    return {
      lowStock: lowStock.map(item => ({
        ingredient: item.ingredient.name,
        currentStock: item.currentStock,
        minStock: item.minStock,
        unit: item.unit,
        percentageRemaining: (item.currentStock / item.minStock * 100).toFixed(1)
      })),
      expiring: expiring.map(item => ({
        ingredient: item.ingredient.name,
        batches: item.batches
          .filter(b => b.isActive && b.expiryDate)
          .map(b => ({
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            expiryDate: b.expiryDate,
            daysUntilExpiry: Math.ceil((b.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          }))
      }))
    };
  }
  
  async getInventoryValue() {
    return Inventory.getStockValue();
  }
  
  async getMovementHistory(days = 7, type = null) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    const query = {
      'movements.date': { $gte: dateFrom }
    };
    
    if (type) {
      query['movements.type'] = type;
    }
    
    const items = await Inventory.find(query)
      .populate('ingredient')
      .populate('movements.performedBy', 'name')
      .populate('movements.relatedOrder', 'orderNumber');
    
    const movements = [];
    
    items.forEach(item => {
      item.movements
        .filter(m => m.date >= dateFrom && (!type || m.type === type))
        .forEach(movement => {
          movements.push({
            ingredient: item.ingredient.name,
            ...movement.toObject(),
            performedBy: movement.performedBy?.name || 'System'
          });
        });
    });
    
    return movements.sort((a, b) => b.date - a.date);
  }
}

module.exports = new InventoryService();