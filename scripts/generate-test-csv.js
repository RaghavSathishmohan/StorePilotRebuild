const fs = require('fs');
const path = require('path');

// Generate a large CSV file for testing the import function

const categories = [
  'Beverages', 'Snacks', 'Tobacco', 'Household', 'Dairy', 'Frozen', 'Candy',
  'Health & Beauty', 'Automotive', 'Grocery', 'Bakery', 'Deli', 'Pet Supplies'
];

const units = ['unit', 'case', 'pack', 'lb', 'oz', 'gal', 'liter', 'can', 'bottle'];

const suppliers = [
  'Coca-Cola Distributor', 'Frito-Lay', 'Philip Morris', 'Procter & Gamble',
  'Kraft Foods', 'Nestle', 'PepsiCo', 'General Mills', 'Kellogg\'s',
  'Hershey Company', 'Mars Inc', 'Unilever', 'Colgate-Palmolive'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  const num = Math.random() * (max - min) + min;
  return Number(num.toFixed(decimals));
}

function generateBarcode() {
  // Generate a valid-looking UPC/EAN barcode
  return String(randomInt(100000000000, 999999999999));
}

function generateSKU(category, index) {
  const prefix = category.substring(0, 3).toUpperCase();
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

function generateProductName(category, index) {
  const descriptors = ['Premium', 'Organic', 'Classic', 'Fresh', 'Natural', 'Original', 'Light', 'Diet', 'Sugar-Free'];
  const descriptor = Math.random() > 0.5 ? descriptors[randomInt(0, descriptors.length - 1)] + ' ' : '';

  const products = {
    'Beverages': ['Cola', 'Lemon-Lime Soda', 'Orange Juice', 'Water', 'Energy Drink', 'Iced Tea', 'Sports Drink'],
    'Snacks': ['Potato Chips', 'Tortilla Chips', 'Pretzels', 'Popcorn', 'Nuts Mix', 'Cheese Puffs', 'Crackers'],
    'Tobacco': ['Cigarettes', 'Chewing Tobacco', 'Cigars', 'Rolling Papers', 'Lighters'],
    'Household': ['Paper Towels', 'Toilet Paper', 'Laundry Detergent', 'Dish Soap', 'Trash Bags', 'Air Freshener'],
    'Dairy': ['Milk', 'Cheese', 'Butter', 'Yogurt', 'Cream Cheese', 'Sour Cream'],
    'Frozen': ['Pizza', 'Ice Cream', 'Vegetables', 'Frozen Meals', 'Breakfast Sandwiches'],
    'Candy': ['Chocolate Bar', 'Gummy Bears', 'Hard Candy', 'Licorice', 'Caramel', 'Mint'],
    'Health & Beauty': ['Toothpaste', 'Shampoo', 'Soap', 'Deodorant', 'Pain Reliever', 'Vitamins'],
    'Automotive': ['Motor Oil', 'Windshield Fluid', 'Air Freshener', 'Car Wash Soap'],
    'Grocery': ['Cereal', 'Pasta', 'Rice', 'Canned Soup', 'Bread', 'Peanut Butter'],
    'Bakery': ['Bagels', 'Muffins', 'Donuts', 'Bread Loaf', 'Croissants'],
    'Deli': ['Sandwich', 'Salad', 'Wrap', 'Sliced Meat', 'Cheese Slices'],
    'Pet Supplies': ['Dog Food', 'Cat Food', 'Treats', 'Toys', 'Cat Litter']
  };

  const items = products[category] || ['Item'];
  const item = items[index % items.length];
  const size = randomInt(6, 64);
  return `${descriptor}${item} ${size}oz`;
}

// Stock distribution: creates realistic inventory levels
function generateStockLevel() {
  const rand = Math.random();
  if (rand < 0.05) return 0; // 5% out of stock
  if (rand < 0.15) return randomInt(1, 10); // 10% critically low (1-10)
  if (rand < 0.30) return randomInt(11, 25); // 15% low stock (11-25)
  if (rand < 0.60) return randomInt(26, 75); // 30% medium stock (26-75)
  return randomInt(76, 500); // 40% well stocked (76-500)
}

function generateCSVRow(index, category) {
  const name = generateProductName(category, index);
  const sku = generateSKU(category, index);
  const barcode = generateBarcode();
  const costPrice = randomFloat(0.5, 15);
  const markup = randomFloat(1.3, 2.5); // 30% to 150% markup
  const sellingPrice = Number((costPrice * markup).toFixed(2));
  const taxRate = randomFloat(0, 10, 1);

  // Realistic stock distribution
  const stock = generateStockLevel();

  // Min stock varies by how fast items sell
  const minStock = randomInt(5, 40);
  const maxStock = minStock * randomInt(4, 20);
  const reorderPoint = Math.floor(minStock * 1.5);
  const reorderQty = minStock * randomInt(2, 5);

  const unitOfMeasure = units[randomInt(0, units.length - 1)];
  const supplier = suppliers[randomInt(0, suppliers.length - 1)];
  const isActive = Math.random() > 0.1 ? 'true' : 'false'; // 90% active

  // Occasionally leave some fields empty to test error handling
  const hasBarcode = Math.random() > 0.05; // 5% missing barcodes
  const hasSupplier = Math.random() > 0.1; // 10% missing supplier

  return [
    sku,
    `"${name}"`, // Quote in case of special characters
    category,
    hasBarcode ? barcode : '',
    costPrice,
    sellingPrice,
    taxRate,
    stock,
    minStock,
    maxStock,
    reorderPoint,
    reorderQty,
    unitOfMeasure,
    hasSupplier ? supplier : '',
    isActive
  ].join(',');
}

function generateCSV(numRows) {
  const headers = [
    'sku', 'name', 'category', 'barcode', 'cost_price', 'selling_price',
    'tax_rate', 'stock', 'min_stock', 'max_stock', 'reorder_point',
    'reorder_quantity', 'unit_of_measure', 'supplier_name', 'is_active'
  ].join(',');

  const rows = [headers];
  const products = [];

  for (let i = 0; i < numRows; i++) {
    const category = categories[i % categories.length];
    const row = generateCSVRow(i, category);
    rows.push(row);

    // Parse the row to keep product data for sales generation
    const values = row.split(',');
    products.push({
      sku: values[0],
      name: values[1].replace(/"/g, ''),
      selling_price: parseFloat(values[5])
    });
  }

  return { csv: rows.join('\n'), products };
}

function generateSalesCSV(products, numSales) {
  const headers = [
    'receipt_number', 'transaction_date', 'sku', 'product_name', 'quantity',
    'unit_price', 'discount_amount', 'tax_amount', 'payment_method', 'total_amount'
  ].join(',');

  const rows = [headers];
  const sales = generateSalesData(products, numSales);

  for (const sale of sales) {
    rows.push([
      sale.receipt_number,
      sale.transaction_date,
      sale.sku,
      `"${sale.name}"`,
      sale.quantity,
      sale.unit_price,
      sale.discount_amount,
      sale.tax_amount,
      sale.payment_method,
      sale.total_amount
    ].join(','));
  }

  return rows.join('\n');
}

// Generate sales data for a product
function generateSalesData(products, numSales) {
  const sales = [];
  const paymentMethods = ['card', 'cash', 'debit', 'mobile'];
  const now = new Date();

  for (let i = 0; i < numSales; i++) {
    // Pick random products for this sale (1-5 items)
    const numItems = randomInt(1, 5);
    const saleItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = products[randomInt(0, products.length - 1)];
      const qty = randomInt(1, 10);
      const lineTotal = product.selling_price * qty;
      subtotal += lineTotal;
      saleItems.push({
        sku: product.sku,
        name: product.name,
        qty: qty,
        unit_price: product.selling_price
      });
    }

    const tax = subtotal * 0.0825; // 8.25% tax
    const total = subtotal + tax;
    const paymentMethod = paymentMethods[randomInt(0, paymentMethods.length - 1)];

    // Random date in last 90 days
    const saleDate = new Date(now.getTime() - randomInt(0, 90 * 24 * 60 * 60 * 1000));
    const dateStr = saleDate.toISOString().split('T')[0];
    const timeStr = String(randomInt(6, 22)).padStart(2, '0') + ':' + String(randomInt(0, 59)).padStart(2, '0');

    // Create a row for each item in the sale
    for (const item of saleItems) {
      sales.push({
        receipt_number: `RCP-${dateStr.replace(/-/g, '')}-${String(i).padStart(4, '0')}`,
        transaction_date: `${dateStr} ${timeStr}:00`,
        sku: item.sku,
        name: item.name,
        quantity: item.qty,
        unit_price: item.unit_price,
        discount_amount: 0,
        tax_amount: (item.unit_price * item.qty * 0.0825).toFixed(2),
        payment_method: paymentMethod,
        total_amount: total.toFixed(2)
      });
    }
  }

  return sales;
}

// Generate different sizes for different test scenarios
const sizes = [
  { name: 'test-small', rows: 50, sales: 100 },
  { name: 'test-medium', rows: 500, sales: 1000 },
  { name: 'test-large', rows: 2000, sales: 5000 },
  { name: 'test-stress', rows: 10000, sales: 20000 }
];

const outputDir = path.join(__dirname, '..', 'test-data');

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Generating test CSV files...\n');

sizes.forEach(({ name, rows, sales }) => {
  // Generate products
  const { csv: productsCSV, products } = generateCSV(rows);
  const productsPath = path.join(outputDir, `${name}-products.csv`);
  fs.writeFileSync(productsPath, productsCSV);
  const productsStats = fs.statSync(productsPath);

  // Generate sales
  const salesCSV = generateSalesCSV(products, sales);
  const salesPath = path.join(outputDir, `${name}-sales.csv`);
  fs.writeFileSync(salesPath, salesCSV);
  const salesStats = fs.statSync(salesPath);

  console.log(`✓ ${name}-products.csv (${rows.toLocaleString()} products, ${(productsStats.size / 1024).toFixed(1)} KB)`);
  console.log(`✓ ${name}-sales.csv (${sales.toLocaleString()} sales lines, ${(salesStats.size / 1024).toFixed(1)} KB)`);
  console.log(`  Stock distribution: ~5% out of stock, 15% low, 30% medium, 40% well stocked`);
  console.log('');
});

console.log('Files saved to:', outputDir);
console.log('\nStock Distribution:');
console.log('  - 5% out of stock (0 units)');
console.log('  - 10% critically low (1-10 units)');
console.log('  - 15% low stock (11-25 units)');
console.log('  - 30% medium stock (26-75 units)');
console.log('  - 40% well stocked (76-500 units)');
console.log('\nTo use these files:');
console.log('1. Go to /dashboard/imports');
console.log('2. Import *-products.csv first (set import type to "products")');
console.log('3. Import *-sales.csv second (set import type to "sales")');
console.log('4. Check analytics at /dashboard/analytics');
