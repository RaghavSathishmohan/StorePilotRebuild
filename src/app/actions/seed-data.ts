'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const SAMPLE_PRODUCTS = [
  { sku: 'BEV-001', name: 'Coca-Cola 12oz Can', category: 'Beverages', barcode: '049000028904', cost_price: 0.65, selling_price: 1.99, tax_rate: 8.25, stock: 150, min_stock: 24 },
  { sku: 'BEV-002', name: 'Pepsi 12oz Can', category: 'Beverages', barcode: '049000028905', cost_price: 0.65, selling_price: 1.99, tax_rate: 8.25, stock: 145, min_stock: 24 },
  { sku: 'BEV-003', name: 'Mountain Dew 20oz', category: 'Beverages', barcode: '049000028906', cost_price: 0.85, selling_price: 2.49, tax_rate: 8.25, stock: 80, min_stock: 20 },
  { sku: 'BEV-004', name: 'Red Bull 8.4oz', category: 'Beverages', barcode: '049000028907', cost_price: 1.50, selling_price: 3.49, tax_rate: 8.25, stock: 60, min_stock: 24 },
  { sku: 'BEV-005', name: 'Monster Energy 16oz', category: 'Beverages', barcode: '049000028908', cost_price: 1.35, selling_price: 3.29, tax_rate: 8.25, stock: 55, min_stock: 24 },
  { sku: 'BEV-006', name: 'Dr Pepper 20oz', category: 'Beverages', barcode: '049000028909', cost_price: 0.85, selling_price: 2.49, tax_rate: 8.25, stock: 3, min_stock: 24 },

  { sku: 'SNK-001', name: 'Doritos Nacho Cheese', category: 'Snacks', barcode: '028400070854', cost_price: 1.25, selling_price: 3.49, tax_rate: 8.25, stock: 90, min_stock: 15 },
  { sku: 'SNK-002', name: 'Cheetos Crunchy', category: 'Snacks', barcode: '028400070855', cost_price: 1.20, selling_price: 3.29, tax_rate: 8.25, stock: 75, min_stock: 15 },
  { sku: 'SNK-003', name: "Lay's Classic", category: 'Snacks', barcode: '028400070856', cost_price: 1.15, selling_price: 3.19, tax_rate: 8.25, stock: 85, min_stock: 15 },
  { sku: 'SNK-004', name: 'Oreo Cookies', category: 'Snacks', barcode: '044000032198', cost_price: 1.85, selling_price: 4.49, tax_rate: 8.25, stock: 40, min_stock: 12 },
  { sku: 'SNK-005', name: 'Snickers Bar', category: 'Snacks', barcode: '040000032199', cost_price: 0.65, selling_price: 1.49, tax_rate: 8.25, stock: 120, min_stock: 36 },
  { sku: 'SNK-006', name: 'Takis Fuego', category: 'Snacks', barcode: '028400070857', cost_price: 1.35, selling_price: 3.79, tax_rate: 8.25, stock: 8, min_stock: 12 },
  { sku: 'SNK-007', name: 'Cheetos Flamin Hot', category: 'Snacks', barcode: '028400070858', cost_price: 1.20, selling_price: 3.29, tax_rate: 8.25, stock: 2, min_stock: 15 },
  { sku: 'SNK-008', name: 'Pringles Original', category: 'Snacks', barcode: '028400070859', cost_price: 1.05, selling_price: 2.49, tax_rate: 8.25, stock: 5, min_stock: 15 },

  { sku: 'TOB-001', name: 'Marlboro Red', category: 'Tobacco', barcode: '028200012345', cost_price: 6.50, selling_price: 8.99, tax_rate: 8.25, stock: 25, min_stock: 10 },
  { sku: 'TOB-002', name: 'Camel Filters', category: 'Tobacco', barcode: '028200012346', cost_price: 6.45, selling_price: 8.89, tax_rate: 8.25, stock: 30, min_stock: 10 },
  { sku: 'TOB-003', name: 'Copenhagen LC', category: 'Tobacco', barcode: '028200012347', cost_price: 3.25, selling_price: 5.49, tax_rate: 8.25, stock: 45, min_stock: 15 },
  { sku: 'TOB-004', name: 'Swisher Sweets', category: 'Tobacco', barcode: '028200012348', cost_price: 2.85, selling_price: 4.99, tax_rate: 8.25, stock: 20, min_stock: 12 },

  { sku: 'HH-001', name: 'Bounty Paper Towels', category: 'Household', barcode: '037000128945', cost_price: 5.95, selling_price: 11.99, tax_rate: 8.25, stock: 18, min_stock: 8 },
  { sku: 'HH-002', name: 'Charmin Ultra Soft', category: 'Household', barcode: '037000128946', cost_price: 6.25, selling_price: 12.99, tax_rate: 8.25, stock: 22, min_stock: 8 },
  { sku: 'HH-003', name: 'Tide Pods', category: 'Household', barcode: '037000128947', cost_price: 8.95, selling_price: 14.99, tax_rate: 8.25, stock: 35, min_stock: 6 },
  { sku: 'HH-004', name: 'Clorox Bleach', category: 'Household', barcode: '044600000289', cost_price: 2.95, selling_price: 5.99, tax_rate: 8.25, stock: 28, min_stock: 10 },

  { sku: 'DAI-001', name: 'Whole Milk Gallon', category: 'Dairy', barcode: '040000012345', cost_price: 2.25, selling_price: 3.99, tax_rate: 8.25, stock: 12, min_stock: 12 },
  { sku: 'DAI-002', name: 'Large Eggs Dozen', category: 'Dairy', barcode: '040000012346', cost_price: 1.85, selling_price: 3.49, tax_rate: 8.25, stock: 18, min_stock: 15 },
  { sku: 'DAI-003', name: 'Kraft Singles Cheese', category: 'Dairy', barcode: '044000032200', cost_price: 2.45, selling_price: 4.79, tax_rate: 8.25, stock: 15, min_stock: 10 },
]

export async function seedDemoData(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const serviceSupabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const results = {
    productsCreated: 0,
    salesCreated: 0,
    errors: [] as string[],
  }

  // Create categories first (using service client to bypass RLS)
  const categories = [...new Set(SAMPLE_PRODUCTS.map(p => p.category))]
  const categoryMap: Record<string, string> = {}

  for (const categoryName of categories) {
    // Check if category exists
    const { data: existingCats } = await serviceSupabase
      .from('product_categories')
      .select('id')
      .eq('store_id', storeId)
      .eq('name', categoryName)

    if (existingCats && existingCats.length > 0) {
      categoryMap[categoryName] = existingCats[0].id
    } else {
      // Create new category
      const { data: newCat, error } = await serviceSupabase
        .from('product_categories')
        .insert({ store_id: storeId, name: categoryName })
        .select('id')
        .single()

      if (newCat) {
        categoryMap[categoryName] = newCat.id
      } else if (error) {
        results.errors.push(`Category ${categoryName}: ${error.message}`)
      }
    }
  }

  // Create products
  for (const product of SAMPLE_PRODUCTS) {
    const categoryId = categoryMap[product.category] || null

    const productData = {
      store_id: storeId,
      sku: product.sku,
      name: product.name,
      description: `Popular ${product.category.toLowerCase()} item`,
      category_id: categoryId,
      barcode: product.barcode,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      tax_rate: product.tax_rate,
      stock: product.stock,
      min_stock_level: product.min_stock,
      max_stock_level: product.min_stock * 8,
      reorder_point: Math.floor(product.min_stock * 1.5),
      reorder_quantity: product.min_stock * 2,
      unit_of_measure: 'unit',
      is_active: true,
    }

    // Try to insert first, ignore conflicts (using service client)
    const { data: insertedProduct, error } = await serviceSupabase
      .from('products')
      .insert(productData)
      .select('id')
      .single()

    if (error) {
      // Product already exists, that's ok
      if (error.code === '23505') {
        results.productsCreated++
      } else {
        results.errors.push(`${product.sku}: ${error.message} (code: ${error.code})`)
      }
    } else if (insertedProduct) {
      results.productsCreated++
    }
  }

  // Small delay to ensure products are committed
  await new Promise(resolve => setTimeout(resolve, 100))

  // Get product IDs for sales (using service client to bypass RLS)
  const { data: products, error: productsError } = await serviceSupabase
    .from('products')
    .select('id, sku, name, selling_price')
    .eq('store_id', storeId)

  if (productsError) {
    throw new Error(`Failed to query products: ${productsError.message}`)
  }

  if (!products || products.length === 0) {
    // List what products we tried to create
    const skus = SAMPLE_PRODUCTS.map(p => p.sku).join(', ')
    throw new Error(`No products found for store ${storeId}. Created ${results.productsCreated} products. Tried to create: ${skus}`)
  }

  const productMap: Record<string, typeof products[0]> = {}
  products.forEach(p => { productMap[p.sku] = p })

  // Create sample sales
  const salesData = [
    { total: 45.67, tax: 3.67, payment: 'card', hours_ago: 0, items: [['BEV-001', 5], ['SNK-001', 2]] },
    { total: 32.45, tax: 2.45, payment: 'cash', hours_ago: 2, items: [['BEV-002', 3], ['SNK-005', 4], ['TOB-001', 2]] },
    { total: 78.90, tax: 6.90, payment: 'card', hours_ago: 4, items: [['HH-001', 2], ['HH-002', 2], ['BEV-004', 6]] },
    { total: 156.78, tax: 12.78, payment: 'card', hours_ago: 8, items: [['HH-003', 5], ['BEV-004', 10], ['SNK-001', 3]] },
    { total: 234.56, tax: 18.56, payment: 'card', hours_ago: 72, items: [['TOB-001', 10], ['TOB-002', 8], ['TOB-003', 15]] },
    { total: 123.45, tax: 9.45, payment: 'card', hours_ago: 144, items: [['BEV-001', 15], ['BEV-002', 10], ['SNK-001', 5], ['SNK-002', 5]] },
    { total: 145.67, tax: 11.67, payment: 'card', hours_ago: 192, items: [['HH-001', 3], ['HH-002', 3], ['HH-003', 2], ['HH-004', 5]] },
    { total: 89.99, tax: 7.99, payment: 'card', hours_ago: 216, items: [['SNK-004', 5], ['DAI-001', 5], ['DAI-002', 5]] },
    { total: 67.34, tax: 5.34, payment: 'cash', hours_ago: 240, items: [['BEV-001', 10], ['SNK-003', 5]] },
    { total: 43.21, tax: 3.21, payment: 'card', hours_ago: 288, items: [['TOB-001', 3], ['TOB-003', 5]] },
  ]

  for (const sale of salesData) {
    const transactionDate = new Date(Date.now() - sale.hours_ago * 3600000).toISOString()
    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const { data: receipt, error: receiptError } = await serviceSupabase
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
      .single()

    if (receiptError || !receipt) {
      results.errors.push(`Receipt error: ${receiptError?.message || 'Unknown'}`)
      continue
    }

    let lineItemsCreated = 0
    for (const [sku, qty] of sale.items) {
      const product = productMap[sku]
      if (!product) {
        results.errors.push(`Product not found for SKU: ${sku}`)
        continue
      }

      const lineTotal = product.selling_price * qty
      const lineTax = lineTotal * 0.0825

      const { error: lineError } = await serviceSupabase
        .from('sale_line_items')
        .insert({
          receipt_id: receipt.id,
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: qty,
          unit_price: product.selling_price,
          total_amount: lineTotal,
          tax_amount: lineTax,
        })

      if (lineError) {
        results.errors.push(`Line item error for ${sku}: ${lineError.message}`)
      } else {
        lineItemsCreated++
        results.salesCreated++
      }
    }
  }

  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/os')

  return results
}

export async function clearDemoData(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const serviceSupabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Delete sales first (using service client to bypass RLS)
  await serviceSupabase.from('sale_line_items').delete().eq('store_id', storeId)
  await serviceSupabase.from('sales_receipts').delete().eq('store_id', storeId)

  // Delete products (using service client)
  await serviceSupabase.from('products').delete().eq('store_id', storeId)

  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/analytics')
  revalidatePath('/dashboard/os')

  return { success: true }
}
