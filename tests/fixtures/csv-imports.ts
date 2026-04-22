// CSV import test fixtures

// Valid products CSV
export const VALID_PRODUCTS_CSV = `sku,name,description,category,barcode,selling_price,cost_price,tax_rate,stock,min_stock_level
PROD-001,Coca-Cola 12oz,Classic Coca-Cola 12oz can,Beverages,123456789012,1.99,0.99,8.25,100,20
PROD-002,Doritos Nacho Cheese,Nacho cheese flavor chips,Snacks,234567890123,3.49,1.75,8.25,50,10
PROD-003,Marlboro Red,Premium cigarettes,Tobacco,345678901234,12.99,8.50,8.25,25,5
PROD-004,Paper Towels,2-ply paper towels 6-pack,Household,456789012345,8.99,5.25,8.25,40,8
PROD-005,Whole Milk Gallon,Organic whole milk,Dairy,567890123456,4.99,2.75,8.25,30,6`

// Products with missing required fields
export const INVALID_PRODUCTS_CSV = `sku,name,selling_price,stock
,Missing SKU,1.99,100
PROD-006,,2.99,50
PROD-007,Valid Product,,30
PROD-008,No Price,9.99,`

// Products with wrong data types
export const MALFORMED_PRODUCTS_CSV = `sku,name,selling_price,stock
PROD-009,Product A,not_a_price,100
PROD-010,Product B,5.99,not_a_number
PROD-011,Product C,$12.99,50`

// CSV with synonyms (different column names)
export const SYNONYM_COLUMNS_CSV = `product_code,item_name,product_category,retail_price,on_hand
CODE-001,Test Product,Category A,9.99,100
CODE-002,Another Product,Category B,14.99,50`

// Unified import CSV (products + sales)
export const UNIFIED_IMPORT_CSV = `sku,name,category,selling_price,stock,receipt_number,transaction_date,quantity,unit_price,payment_method
UNI-001,Unified Product A,Beverages,2.49,75,,,,,
UNI-002,Unified Product B,Snacks,1.99,60,,,,,
,,,,,RCP-001,2024-06-21 14:30:00,2,2.49,cash
,,,,,RCP-002,2024-06-21 15:45:00,1,1.99,card`

// Large CSV for performance testing (100 rows)
export const generateLargeCSV = (count: number = 100): string => {
  const headers = 'sku,name,category,selling_price,cost_price,stock'
  const rows: string[] = [headers]

  for (let i = 0; i < count; i++) {
    rows.push(
      `BULK-${String(i).padStart(3, '0')},Bulk Product ${i},Beverages,${(1 + Math.random() * 10).toFixed(2)},${(0.5 + Math.random() * 5).toFixed(2)},${Math.floor(Math.random() * 100)}`
    )
  }

  return rows.join('\n')
}

// CSV with special characters
export const SPECIAL_CHARS_CSV = `sku,name,description,category,selling_price
SPEC-001,Café Latte,"Premium coffee with milk",Beverages,4.99
SPEC-002,M&M's,"Chocolate candies with candy shell",Snacks,3.49
SPEC-003,Diet Coke®,"Zero calorie cola",Beverages,1.99`

// CSV with quoted fields containing commas
export const QUOTED_FIELDS_CSV = `sku,name,description,selling_price
QUOTE-001,"Large Pizza, 16\"",Delicious cheese pizza with tomato sauce,12.99
QUOTE-002,"Combo Deal: Chips, Drink, and Sandwich",Complete lunch combo,8.99`

export const downloadTemplateCSV = (): string => {
  return `sku,name,description,category,barcode,selling_price,cost_price,tax_rate,stock,min_stock_level,max_stock_level,reorder_point,reorder_quantity,unit_of_measure,supplier_name,supplier_contact,is_active
TEMPLATE-001,Template Product,Product description,Beverages,123456789012,1.99,1.00,8.25,100,20,500,25,50,unit,Supplier Inc,contact@supplier.com,true`
}
