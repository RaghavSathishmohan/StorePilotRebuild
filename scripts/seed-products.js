// Seed script for products and sales data
// Usage: node scripts/seed-products.js <store-id>

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const storeId = process.argv[2];
if (!storeId) {
  console.error('Error: Provide store ID as argument');
  console.error('Usage: node scripts/seed-products.js <store-id>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const products = [
  // Beverages - High velocity, good margins
  { sku: 'BEV-001', name: 'Coca-Cola 12oz Can', category: 'Beverages', barcode: '049000028904', cost_price: 0.65, selling_price: 1.99, tax_rate: 8.25, stock: 150, min_stock_level: 24 },
  { sku: 'BEV-002', name: 'Pepsi 12oz Can', category: 'Beverages', barcode: '049000028905', cost_price: 0.65, selling_price: 1.99, tax_rate: 8.25, stock: 145, min_stock_level: 24 },
  { sku: 'BEV-003', name: 'Mountain Dew 20oz', category: 'Beverages', barcode: '049000028906', cost_price: 0.85, selling_price: 2.49, tax_rate: 8.25, stock: 80, min_stock_level: 20 },
  { sku: 'BEV-004', name: 'Red Bull 8.4oz', category: 'Beverages', barcode: '049000028907', cost_price: 1.50, selling_price: 3.49, tax_rate: 8.25, stock: 60, min_stock_level: 24 },
  { sku: 'BEV-005', name: 'Monster Energy 16oz', category: 'Beverages', barcode: '049000028908', cost_price: 1.35, selling_price: 3.29, tax_rate: 8.25, stock: 55, min_stock_level: 24 },

  // Snacks - High margin
  { sku: 'SNK-001', name: 'Doritos Nacho Cheese', category: 'Snacks', barcode: '028400070854', cost_price: 1.25, selling_price: 3.49, tax_rate: 8.25, stock: 90, min_stock_level: 15 },
  { sku: 'SNK-002', name: 'Cheetos Crunchy', category: 'Snacks', barcode: '028400070855', cost_price: 1.20, selling_price: 3.29, tax_rate: 8.25, stock: 75, min_stock_level: 15 },
  { sku: 'SNK-003', name: "Lay's Classic", category: 'Snacks', barcode: '028400070856', cost_price: 1.15, selling_price: 3.19, tax_rate: 8.25, stock: 85, min_stock_level: 15 },
  { sku: 'SNK-004', name: 'Oreo Cookies', category: 'Snacks', barcode: '044000032198', cost_price: 1.85, selling_price: 4.49, tax_rate: 8.25, stock: 40, min_stock_level: 12 },
  { sku: 'SNK-005', name: 'Snickers Bar', category: 'Snacks', barcode: '040000032199', cost_price: 0.65, selling_price: 1.49, tax_rate: 8.25, stock: 120, min_stock_level: 36 },
  { sku: 'SNK-006', name: 'Takis Fuego', category: 'Snacks', barcode: '028400070857', cost_price: 1.35, selling_price: 3.79, tax_rate: 8.25, stock: 8, min_stock_level: 12 },

  // Tobacco - High revenue
  { sku: 'TOB-001', name: 'Marlboro Red', category: 'Tobacco', barcode: '028200012345', cost_price: 6.50, selling_price: 8.99, tax_rate: 8.25, stock: 25, min_stock_level: 10 },
  { sku: 'TOB-002', name: 'Camel Filters', category: 'Tobacco', barcode: '028200012346', cost_price: 6.45, selling_price: 8.89, tax_rate: 8.25, stock: 30, min_stock_level: 10 },
  { sku: 'TOB-003', name: 'Copenhagen LC', category: 'Tobacco', barcode: '028200012347', cost_price: 3.25, selling_price: 5.49, tax_rate: 8.25, stock: 45, min_stock_level: 15 },
  { sku: 'TOB-004', name: 'Swisher Sweets', category: 'Tobacco', barcode: '028200012348', cost_price: 2.85, selling_price: 4.99, tax_rate: 8.25, stock: 20, min_stock_level: 12 },

  // Household
  { sku: 'HH-001', name: 'Bounty Paper Towels', category: 'Household', barcode: '037000128945', cost_price: 5.95, selling_price: 11.99, tax_rate: 8.25, stock: 18, min_stock_level: 8 },
  { sku: 'HH-002', name: 'Charmin Ultra Soft', category: 'Household', barcode: '037000128946', cost_price: 6.25, selling_price: 12.99, tax_rate: 8.25, stock: 22, min_stock_level: 8 },
  { sku: 'HH-003', name: 'Tide Pods', category: 'Household', barcode: '037000128947', cost_price: 8.95, selling_price: 14.99, tax_rate: 8.25, stock: 35, min_stock_level: 6 },
  { sku: 'HH-004', name: 'Clorox Bleach', category: 'Household', barcode: '044600000289', cost_price: 2.95, selling_price: 5.99, tax_rate: 8.25, stock: 28, min_stock_level: 10 },

  // Dairy
  { sku: 'DAI-001', name: 'Whole Milk Gallon', category: 'Dairy', barcode: '040000012345', cost_price: 2.25, selling_price: 3.99, tax_rate: 8.25, stock: 12, min_stock_level: 12 },
  { sku: 'DAI-002', name: 'Large Eggs Dozen', category: 'Dairy', barcode: '040000012346', cost_price: 1.85, selling_price: 3.49, tax_rate: 8.25, stock: 18, min_stock_level: 15 },
  { sku: 'DAI-003', name: 'Kraft Singles Cheese', category: 'Dairy', barcode: '044000032200', cost_price: 2.45, selling_price: 4.79, tax_rate: 8.25, stock: 15, min_stock_level: 10 },

  // Ultra low stock items for testing alerts
  { sku: 'BEV-006', name: 'Dr Pepper 20oz', category: 'Beverages', barcode: '049000028909', cost_price: 0.85, selling_price: 2.49, tax_rate: 8.25, stock: 3, min_stock_level: 24 },
  { sku: 'SNK-007', name: 'Cheetos Flamin Hot', category: 'Snacks', barcode: '028400070858', cost_price: 1.20, selling_price: 3.29, tax_rate: 8.25, stock: 2, min_stock_level: 15 },
  { sku: 'SNK-008', name: 'Pringles Original', category: 'Snacks', barcode: '028400070859', cost_price: 1.05, selling_price: 2.49, tax_rate: 8.25, stock: 5, min_stock_level: 15 },
];

async function seedProducts() {
  console.log(`Seeding products for store: ${storeId}...`);

  for (const product of products) {
    const productData = {
      store_id: storeId,
      ...product,
      description: `Popular ${product.category.toLowerCase()} item`,
      max_stock_level: product.min_stock_level * 8,
      reorder_point: Math.floor(product.min_stock_level * 1.5),
      reorder_quantity: product.min_stock_level * 2,
      unit_of_measure: 'unit',
      is_active: true,
    };

    const { error } = await supabase.from('products').upsert(productData, {
      onConflict: 'store_id,sku',
    });

    if (error) {
      console.error(`Error inserting ${product.sku}:`, error);
    } else {
      console.log(`✓ ${product.name} (${product.stock} in stock)`);
    }
  }

  console.log('\nProducts seeded successfully!');
}

async function seedSales() {
  console.log('\nSeeding sales data...');

  // Get product IDs
  const { data: productData } = await supabase
    .from('products')
    .select('id, sku, selling_price')
    .eq('store_id', storeId);

  if (!productData || productData.length === 0) {
    console.error('No products found. Run product seed first.');
    return;
  }

  const productMap = {};
  productData.forEach(p => { productMap[p.sku] = p; });

  // Generate sample sales receipts
  const salesData = [
    { total: 45.67, tax: 3.67, payment: 'card', date_offset: 0, items: [['BEV-001', 5], ['SNK-001', 2]] },
    { total: 32.45, tax: 2.45, payment: 'cash', date_offset: -2, items: [['BEV-002', 3], ['SNK-005', 4], ['TOB-001', 2]] },
    { total: 78.90, tax: 6.90, payment: 'card', date_offset: -4, items: [['HH-001', 2], ['HH-002', 2], ['BEV-004', 6]] },
    { total: 156.78, tax: 12.78, payment: 'card', date_offset: -8, items: [['HH-003', 5], ['BEV-004', 10], ['SNK-001', 3]] },
    { total: 234.56, tax: 18.56, payment: 'card', date_offset: -72, items: [['TOB-001', 10], ['TOB-002', 8], ['TOB-003', 15]] },
    { total: 123.45, tax: 9.45, payment: 'card', date_offset: -144, items: [['BEV-001', 15], ['BEV-002', 10], ['SNK-001', 5], ['SNK-002', 5]] },
    { total: 145.67, tax: 11.67, payment: 'card', date_offset: -192, items: [['HH-001', 3], ['HH-002', 3], ['HH-003', 2], ['HH-004', 5]] },
    { total: 89.99, tax: 7.99, payment: 'card', date_offset: -216, items: [['SNK-004', 5], ['DAI-001', 5], ['DAI-002', 5]] },
  ];

  for (const sale of salesData) {
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const transactionDate = new Date(Date.now() + sale.date_offset * 3600000).toISOString();

    // Create receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('sales_receipts')
      .insert({
        store_id: storeId,
        receipt_number: receiptNumber,
        transaction_date: transactionDate,
        total_amount: sale.total,
        tax_amount: sale.tax,
        payment_method: sale.payment,
        status: 'completed',
      })
      .select('id')
      .single();

    if (receiptError || !receipt) {
      console.error('Error creating receipt:', receiptError);
      continue;
    }

    // Create line items
    for (const [sku, qty] of sale.items) {
      const product = productMap[sku];
      if (!product) continue;

      const lineTotal = product.selling_price * qty;
      const lineTax = lineTotal * 0.0825;

      await supabase.from('sale_line_items').insert({
        receipt_id: receipt.id,
        product_id: product.id,
        quantity: qty,
        unit_price: product.selling_price,
        total_amount: lineTotal,
        tax_amount: lineTax,
      });
    }

    console.log(`✓ Sale: $${sale.total.toFixed(2)} (${sale.payment})`);
  }

  console.log('\nSales seeded successfully!');
}

async function main() {
  await seedProducts();
  await seedSales();
  console.log('\n✅ Done! Navigate to /dashboard/os to see analytics insights.');
  process.exit(0);
}

main().catch(console.error);
