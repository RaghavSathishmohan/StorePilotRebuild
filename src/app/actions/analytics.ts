'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/admin'
import { checkStorePermission } from '@/lib/permissions'

export async function getStoreAnalytics(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const { allowed } = await checkStorePermission(storeId, user.id, 'staff')
  if (!allowed) {
    throw new Error('You do not have access to this store')
  }

  const serviceClient = createServiceClient()

  // Get products data with category info
  const { data: products } = await serviceClient
    .from('products')
    .select('*, product_categories(name)')
    .eq('store_id', storeId)

  // Get sales data with line items
  const { data: salesReceipts } = await serviceClient
    .from('sales_receipts')
    .select('*, sale_line_items(*, products(name, sku, cost_price, category_id))')
    .eq('store_id', storeId)

  // Calculate metrics
  const productsList = (products || []) as any[]
  const salesList = (salesReceipts || []) as any[]

  // Product counts
  const totalProducts = productsList.length
  const activeProducts = productsList.filter(p => p.is_active !== false).length
  const inactiveProducts = totalProducts - activeProducts

  // Inventory value calculation - use product.stock if inventory_snapshots is empty
  let totalInventoryValue = 0
  let totalCostValue = 0
  const inventoryByCategory: Record<string, number> = {}
  const costByCategory: Record<string, number> = {}

  let lowStockProducts = 0
  let outOfStockProducts = 0

  productsList.forEach(product => {
    const stockQty = product.stock || 0
    const costPrice = product.cost_price || 0
    const sellingPrice = product.selling_price || 0

    totalInventoryValue += stockQty * sellingPrice
    totalCostValue += stockQty * costPrice

    // Get category name
    const categoryName = product.product_categories?.name || 'Uncategorized'

    inventoryByCategory[categoryName] = (inventoryByCategory[categoryName] || 0) + (stockQty * sellingPrice)
    costByCategory[categoryName] = (costByCategory[categoryName] || 0) + (stockQty * costPrice)

    if (stockQty === 0) {
      outOfStockProducts++
    } else if (stockQty <= (product.min_stock_level || product.reorder_point || 0)) {
      lowStockProducts++
    }
  })

  // Sales metrics
  let totalRevenue = 0
  let totalCost = 0
  let totalItemsSold = 0
  const salesByCategory: Record<string, number> = {}
  const salesByPaymentMethod: Record<string, number> = {}
  const productSales: Record<string, { sku: string; name: string; quantity: number; revenue: number; cost: number }> = {}

  salesList.forEach(receipt => {
    const paymentMethod = receipt.payment_method || 'unknown'
    salesByPaymentMethod[paymentMethod] = (salesByPaymentMethod[paymentMethod] || 0) + (receipt.total_amount || 0)

    receipt.sale_line_items?.forEach((item: any) => {
      const revenue = (item.unit_price || 0) * (item.quantity || 0)
      const cost = (item.cost_price || item.products?.cost_price || 0) * (item.quantity || 0)

      totalRevenue += revenue
      totalCost += cost
      totalItemsSold += item.quantity || 0

      // Get category from the product in the line item or from products list
      const product = productsList.find(p => p.id === item.product_id)
      const categoryName = product?.product_categories?.name || 'Uncategorized'
      salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) + revenue

      const sku = item.product_sku || item.products?.sku || 'unknown'
      const name = item.product_name || item.products?.name || 'Unknown'
      if (!productSales[sku]) {
        productSales[sku] = {
          sku,
          name,
          quantity: 0,
          revenue: 0,
          cost: 0,
        }
      }
      productSales[sku].quantity += item.quantity || 0
      productSales[sku].revenue += revenue
      productSales[sku].cost += cost
    })
  })

  const totalSales = salesList.length
  const grossProfit = totalRevenue - totalCost
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0
  const averageItemsPerTransaction = totalSales > 0 ? totalItemsSold / totalSales : 0

  // Top products
  const topSellingProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(p => ({ ...p, profit: p.revenue - p.cost }))

  const topRevenueProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(p => ({ ...p, profit: p.revenue - p.cost }))

  return {
    // Revenue metrics
    totalRevenue,
    totalCost,
    grossProfit,
    grossMargin,

    // Sales metrics
    totalSales,
    totalItemsSold,
    averageOrderValue,
    averageItemsPerTransaction,

    // Product metrics
    totalProducts,
    activeProducts,
    inactiveProducts,
    lowStockProducts,
    outOfStockProducts,

    // Inventory
    totalInventoryValue,
    totalCostValue,
    inventoryByCategory,
    costByCategory,

    // Breakdowns
    salesByCategory,
    salesByPaymentMethod,
    topSellingProducts,
    topRevenueProducts,

    // Raw data for detailed views
    products: productsList,
    sales: salesList,
  }
}

export async function getSalesTrend(storeId: string, days: number = 30) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const serviceClient = createServiceClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: receipts } = await serviceClient
    .from('sales_receipts')
    .select('transaction_date, total_amount')
    .eq('store_id', storeId)
    .gte('transaction_date', startDate.toISOString())
    .order('transaction_date', { ascending: true })

  const receiptsList = (receipts || []) as any[]

  // Group by date
  const dailySales: Record<string, number> = {}
  receiptsList.forEach(receipt => {
    const date = receipt.transaction_date?.split('T')[0] || 'unknown'
    dailySales[date] = (dailySales[date] || 0) + (receipt.total_amount || 0)
  })

  // Fill in missing dates with 0
  const result: { date: string; amount: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      amount: dailySales[dateStr] || 0
    })
  }

  return result
}

export async function getCategoryPerformance(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const serviceClient = createServiceClient()

  // Get categories
  const { data: categories } = await serviceClient
    .from('product_categories')
    .select('id, name')
    .eq('store_id', storeId)

  // Get products with stock
  const { data: products } = await serviceClient
    .from('products')
    .select('category_id, stock, selling_price, cost_price')
    .eq('store_id', storeId)

  // Get receipts for this store first
  const { data: receipts } = await serviceClient
    .from('sales_receipts')
    .select('id')
    .eq('store_id', storeId)

  const receiptIds = (receipts || []).map(r => r.id)

  // Get line items for those receipts
  let itemsList: any[] = []
  if (receiptIds.length > 0) {
    const { data: lineItems } = await serviceClient
      .from('sale_line_items')
      .select('quantity, unit_price, product_id, products(category_id)')
      .in('receipt_id', receiptIds)
    itemsList = lineItems || []
  }

  const categoriesList = (categories || []) as any[]
  const productsList = (products || []) as any[]

  const categoryStats: Record<string, {
    name: string
    productCount: number
    inventoryValue: number
    salesRevenue: number
    itemsSold: number
  }> = {}

  // Initialize categories
  categoriesList.forEach(cat => {
    categoryStats[cat.id] = {
      name: cat.name,
      productCount: 0,
      inventoryValue: 0,
      salesRevenue: 0,
      itemsSold: 0,
    }
  })

  // Add Uncategorized
  categoryStats['uncategorized'] = {
    name: 'Uncategorized',
    productCount: 0,
    inventoryValue: 0,
    salesRevenue: 0,
    itemsSold: 0,
  }

  // Count products and inventory
  productsList.forEach(product => {
    const catId = product.category_id || 'uncategorized'
    if (categoryStats[catId]) {
      categoryStats[catId].productCount++
      const qty = product.stock || 0
      categoryStats[catId].inventoryValue += qty * (product.selling_price || 0)
    }
  })

  // Count sales
  itemsList.forEach(item => {
    const catId = item.products?.category_id || item.product_id ? 'uncategorized' : 'uncategorized'
    // Try to get category from the joined products data
    const actualCatId = item.products?.category_id || 'uncategorized'
    if (categoryStats[actualCatId]) {
      categoryStats[actualCatId].itemsSold += item.quantity || 0
      categoryStats[actualCatId].salesRevenue += (item.unit_price || 0) * (item.quantity || 0)
    }
  })

  return Object.values(categoryStats)
    .filter(cat => cat.productCount > 0 || cat.itemsSold > 0)
    .sort((a, b) => b.salesRevenue - a.salesRevenue)
}
