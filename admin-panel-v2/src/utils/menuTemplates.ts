// Menu import/export templates

export const generateCategoryCSVTemplate = () => {
  const headers = ['name', 'nameAr', 'description', 'descriptionAr', 'icon', 'displayOrder', 'isActive', 'imageUrl'];
  const sampleData = [
    ['Appetizers', 'المقبلات', 'Delicious starters', 'مقبلات لذيذة', 'utensils', '1', 'true', 'https://example.com/appetizers.jpg'],
    ['Main Courses', 'الأطباق الرئيسية', 'Hearty main dishes', 'أطباق رئيسية دسمة', 'utensils', '2', 'true', 'https://example.com/mains.jpg'],
    ['Desserts', 'الحلويات', 'Sweet treats', 'حلويات', 'cake', '3', 'true', 'https://example.com/desserts.jpg'],
    ['Beverages', 'المشروبات', 'Refreshing drinks', 'مشروبات منعشة', 'coffee', '4', 'true', 'https://example.com/drinks.jpg']
  ];
  
  let csv = headers.join(',') + '\n';
  sampleData.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  return csv;
};

export const generateMenuItemCSVTemplate = () => {
  const headers = [
    'name', 'nameAr', 'category', 'price', 'cost', 'description', 'descriptionAr',
    'available', 'inStock', 'stockQuantity', 'prepTime', 'calories', 'protein',
    'carbs', 'fat', 'allergens', 'dietary', 'isSpecial', 'discount', 'recommended',
    'featured', 'imageUrl'
  ];
  
  const sampleData = [
    [
      'Caesar Salad', 'سلطة سيزر', 'appetizers', '12.99', '4.50',
      'Fresh romaine lettuce with caesar dressing', 'خس روماني طازج مع صلصة السيزر',
      'true', 'true', '-1', '10', '320', '15', '25', '20',
      'dairy;eggs', 'vegetarian', 'false', '0', 'true', 'false',
      'https://example.com/caesar-salad.jpg'
    ],
    [
      'Grilled Chicken', 'دجاج مشوي', 'main-courses', '24.99', '8.00',
      'Perfectly grilled chicken breast', 'صدر دجاج مشوي بشكل مثالي',
      'true', 'true', '50', '25', '450', '35', '15', '25',
      '', 'gluten-free', 'true', '10', 'true', 'true',
      'https://example.com/grilled-chicken.jpg'
    ],
    [
      'Chocolate Cake', 'كعكة الشوكولاتة', 'desserts', '8.99', '2.50',
      'Rich chocolate layer cake', 'كعكة الشوكولاتة الغنية',
      'true', 'true', '20', '5', '550', '8', '65', '30',
      'dairy;eggs;gluten', 'vegetarian', 'false', '0', 'false', 'true',
      'https://example.com/chocolate-cake.jpg'
    ]
  ];
  
  let csv = headers.join(',') + '\n';
  sampleData.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  return csv;
};

export const generateMenuItemJSONTemplate = () => {
  return [
    {
      name: "Caesar Salad",
      nameAr: "سلطة سيزر",
      category: "appetizers",
      price: 12.99,
      cost: 4.50,
      description: "Fresh romaine lettuce with caesar dressing",
      descriptionAr: "خس روماني طازج مع صلصة السيزر",
      available: true,
      inStock: true,
      stockQuantity: -1,
      prepTime: 10,
      calories: 320,
      protein: 15,
      carbs: 25,
      fat: 20,
      allergens: ["dairy", "eggs"],
      dietary: ["vegetarian"],
      isSpecial: false,
      discount: 0,
      recommended: true,
      featured: false,
      imageUrl: "https://example.com/caesar-salad.jpg"
    },
    {
      name: "Grilled Chicken",
      nameAr: "دجاج مشوي",
      category: "main-courses",
      price: 24.99,
      cost: 8.00,
      description: "Perfectly grilled chicken breast",
      descriptionAr: "صدر دجاج مشوي بشكل مثالي",
      available: true,
      inStock: true,
      stockQuantity: 50,
      prepTime: 25,
      calories: 450,
      protein: 35,
      carbs: 15,
      fat: 25,
      allergens: [],
      dietary: ["gluten-free"],
      isSpecial: true,
      discount: 10,
      recommended: true,
      featured: true,
      imageUrl: "https://example.com/grilled-chicken.jpg"
    }
  ];
};