const fs = require('fs');
const path = require('path');

// Additional files with toFixed calls that need fixing
const filesToFix = [
  {
    file: '../admin-panel-v2/src/components/orders/EditOrderModal.tsx',
    fixes: [
      { search: 'editedOrder.tip.toFixed(2)', replace: '(editedOrder.tip || 0).toFixed(2)' },
      { search: 'editedOrder.total.toFixed(2)', replace: '(editedOrder.total || 0).toFixed(2)' },
      { search: 'modifier.price.toFixed(2)', replace: '(modifier.price || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/KitchenDisplay.tsx',
    fixes: [
      { search: 'stockStatus.percentageRemaining.toFixed(0)', replace: '(stockStatus.percentageRemaining || 0).toFixed(0)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/MergeOrdersModal.tsx',
    fixes: [
      { search: 'order.total.toFixed(2)', replace: '(order.total || 0).toFixed(2)' },
      { search: 'subtotal.toFixed(2)', replace: '(subtotal || 0).toFixed(2)' },
      { search: 'total.toFixed(2)', replace: '(total || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/OrderDetailsModal.tsx',
    fixes: [
      { search: '(item.price * item.quantity).toFixed(2)', replace: '((item.price || 0) * (item.quantity || 0)).toFixed(2)' },
      { search: 'order.subtotal.toFixed(2)', replace: '(order.subtotal || 0).toFixed(2)' },
      { search: 'order.discount.toFixed(2)', replace: '(order.discount || 0).toFixed(2)' },
      { search: 'order.tax.toFixed(2)', replace: '(order.tax || 0).toFixed(2)' },
      { search: 'order.tip.toFixed(2)', replace: '(order.tip || 0).toFixed(2)' },
      { search: 'order.total.toFixed(2)', replace: '(order.total || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/OrderFlowPipeline.tsx',
    fixes: [
      { search: 'order.totalAmount.toFixed(2)', replace: '(order.totalAmount || 0).toFixed(2)' },
      { search: 'selectedOrder.totalAmount.toFixed(2)', replace: '(selectedOrder.totalAmount || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/OrderHeatMap.tsx',
    fixes: [
      { search: 'selectedCell.revenue.toFixed(2)', replace: '(selectedCell.revenue || 0).toFixed(2)' },
      { search: 'selectedCell.avgOrderValue.toFixed(2)', replace: '(selectedCell.avgOrderValue || 0).toFixed(2)' },
      { search: 'table.totalRevenue.toFixed(0)', replace: '(table.totalRevenue || 0).toFixed(0)' },
      { search: 'tableData.reduce((sum, t) => sum + t.totalRevenue, 0).toFixed(2)', replace: '(tableData.reduce((sum, t) => sum + (t.totalRevenue || 0), 0) || 0).toFixed(2)' },
      { search: '(tableData.reduce((sum, t) => sum + t.utilization, 0) / tableData.length).toFixed(1)', replace: '((tableData.reduce((sum, t) => sum + (t.utilization || 0), 0) / (tableData.length || 1)) || 0).toFixed(1)' }
    ]
  }
];

let totalFixes = 0;

filesToFix.forEach(({ file, fixes }) => {
  const filePath = path.join(__dirname, file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fixCount = 0;
    
    fixes.forEach(({ search, replace }) => {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const originalLength = content.length;
      content = content.replace(regex, replace);
      
      if (content.length !== originalLength) {
        fixCount++;
      }
    });
    
    if (fixCount > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${fixCount} issues in ${path.basename(file)}`);
      totalFixes += fixCount;
    } else {
      console.log(`ℹ️  No changes needed in ${path.basename(file)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log(`\n✨ Total fixes applied: ${totalFixes}`);