const fs = require('fs');
const path = require('path');

// Files with toFixed calls that need fixing
const filesToFix = [
  {
    file: '../admin-panel-v2/src/components/orders/ComboItemModal.tsx',
    fixes: [
      { search: 'pricing.regular.toFixed(2)', replace: '(pricing.regular || 0).toFixed(2)' },
      { search: 'combo.price.toFixed(2)', replace: '(combo.price || 0).toFixed(2)' },
      { search: 'combo.savings.toFixed(2)', replace: '(combo.savings || 0).toFixed(2)' },
      { search: 'menuItem.price.toFixed(2)', replace: '(menuItem.price || 0).toFixed(2)' },
      { search: 'selectedCombo?.price.toFixed(2)', replace: '(selectedCombo?.price || 0).toFixed(2)' },
      { search: 'calculateComboPrice().savings.toFixed(2)', replace: '(calculateComboPrice().savings || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/CreateOrderModal.tsx',
    fixes: [
      { search: 'item.price.toFixed(2)', replace: '(item.price || 0).toFixed(2)' },
      { search: 'item.totalPrice.toFixed(2)', replace: '(item.totalPrice || 0).toFixed(2)' },
      { search: 'calculateTotals().subtotal.toFixed(2)', replace: '(calculateTotals().subtotal || 0).toFixed(2)' },
      { search: 'calculateTotals().tax.toFixed(2)', replace: '(calculateTotals().tax || 0).toFixed(2)' },
      { search: 'calculateTotals().total.toFixed(2)', replace: '(calculateTotals().total || 0).toFixed(2)' },
      { search: 'modifier.price.toFixed(2)', replace: '(modifier.price || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/EditOrderModal.tsx',
    fixes: [
      { search: 'item.price.toFixed(2)', replace: '(item.price || 0).toFixed(2)' },
      { search: 'editedOrder.subtotal.toFixed(2)', replace: '(editedOrder.subtotal || 0).toFixed(2)' },
      { search: 'editedOrder.discount.toFixed(2)', replace: '(editedOrder.discount || 0).toFixed(2)' },
      { search: 'editedOrder.tax.toFixed(2)', replace: '(editedOrder.tax || 0).toFixed(2)' }
    ]
  },
  {
    file: '../admin-panel-v2/src/components/orders/OrdersManagement.tsx',
    fixes: [
      { search: 'stats.totalRevenue.toFixed(2)', replace: '(stats.totalRevenue || 0).toFixed(2)' },
      { search: 'stats.averageOrderValue.toFixed(2)', replace: '(stats.averageOrderValue || 0).toFixed(2)' },
      { search: 'order.total.toFixed(2)', replace: '(order.total || 0).toFixed(2)' }
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