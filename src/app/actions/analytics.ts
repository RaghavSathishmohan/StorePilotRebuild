'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/admin'
import { checkStorePermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'

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
    .select('*, sale_line_items(*)')
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
      const revenue = (item.unit_price || 0) * (item.quantity || 0) - (item.discount_amount || 0)
      const cost = (item.cost_price || 0) * (item.quantity || 0)

      totalRevenue += revenue
      totalCost += cost
      totalItemsSold += item.quantity || 0

      // Use product_id to find category, fallback to 'Uncategorized'
      const product = productsList.find(p => p.id === item.product_id)
      const categoryName = product?.product_categories?.name || 'Uncategorized'
      salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) + revenue

      const sku = item.product_sku || 'unknown'
      const name = item.product_name || 'Unknown'
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

  // Calculate top category correctly from salesByCategory
  const sortedCategories = Object.entries(salesByCategory).sort((a, b) => b[1] - a[1])
  const topCategoryName = sortedCategories[0]?.[0] || 'N/A'
  const topCategoryRevenue = sortedCategories[0]?.[1] || 0

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

    // Top category info for display
    topCategory: {
      name: topCategoryName,
      revenue: topCategoryRevenue,
      categoryCount: Object.keys(salesByCategory).length
    },

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

  // Get categories with their products in a single efficient query
  const { data: categories } = await serviceClient
    .from('product_categories')
    .select(`
      id,
      name,
      products:products(id, stock, selling_price, cost_price)
    `)
    .eq('store_id', storeId)

  // Get uncategorized products
  const { data: uncategorizedProducts } = await serviceClient
    .from('products')
    .select('id, stock, selling_price, cost_price')
    .eq('store_id', storeId)
    .is('category_id', null)

  // Get sales data with product info using a custom RPC or efficient join
  // First get all line items with product category info
  const { data: salesData } = await serviceClient
    .from('sale_line_items')
    .select(`
      quantity,
      unit_price,
      cost_price,
      product_id,
      receipt:sales_receipts!inner(store_id)
    `)
    .eq('receipt.store_id', storeId)

  // Get all products to map category_ids for line items
  const { data: allProducts } = await serviceClient
    .from('products')
    .select('id, category_id')
    .eq('store_id', storeId)

  const categoriesList = (categories || []) as any[]
  const productsMap = new Map(((allProducts || []) as { id: string; category_id: string | null }[]).map(p => [p.id, p.category_id]))
  const salesItems = (salesData || []) as any[]
  const uncategorizedList = (uncategorizedProducts || []) as any[]

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

  // Count products and inventory from category data
  categoriesList.forEach(cat => {
    const products = cat.products || []
    products.forEach((product: any) => {
      categoryStats[cat.id].productCount++
      const qty = product.stock || 0
      categoryStats[cat.id].inventoryValue += qty * (product.selling_price || 0)
    })
  })

  // Add uncategorized products
  uncategorizedList.forEach(product => {
    categoryStats['uncategorized'].productCount++
    const qty = product.stock || 0
    categoryStats['uncategorized'].inventoryValue += qty * (product.selling_price || 0)
  })

  // Count sales - properly categorize by product's category
  salesItems.forEach(item => {
    const categoryId = productsMap.get(item.product_id) || 'uncategorized'
    const catKey = categoryStats[categoryId] ? categoryId : 'uncategorized'

    categoryStats[catKey].itemsSold += item.quantity || 0
    categoryStats[catKey].salesRevenue += (item.unit_price || 0) * (item.quantity || 0)
  })

  return Object.values(categoryStats)
    .filter(cat => cat.productCount > 0 || cat.itemsSold > 0)
    .sort((a, b) => b.salesRevenue - a.salesRevenue)
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      teamMemberCount: 0,
      totalRevenue: 0,
      storeCount: 0,
      locationCount: 0,
    }
  }

  // Get all stores the user has access to
  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('store_members.user_id', user.id)
    .eq('status', 'active')

  const typedStores = stores as { id: string }[] | null
  const storeIds = typedStores?.map(s => s.id) || []

  if (storeIds.length === 0) {
    return {
      teamMemberCount: 0,
      totalRevenue: 0,
      storeCount: 0,
      locationCount: 0,
    }
  }

  // Get total team member count across all stores
  const { data: members } = await supabase
    .from('store_members')
    .select('id')
    .in('store_id', storeIds)
    .eq('status', 'active')

  // Get location count
  const { data: locations } = await supabase
    .from('store_locations')
    .select('id')
    .in('store_id', storeIds)
    .eq('status', 'active')

  // Get total revenue across all stores using sales_receipts
  const serviceClient = createServiceClient()
  const { data: receipts } = await serviceClient
    .from('sales_receipts')
    .select('total_amount')
    .in('store_id', storeIds)

  const receiptsList = (receipts || []) as { total_amount: number }[]
  const totalRevenue = receiptsList.reduce((sum, r) => sum + (r.total_amount || 0), 0)

  return {
    teamMemberCount: members?.length || 0,
    totalRevenue,
    storeCount: storeIds.length,
    locationCount: locations?.length || 0,
  }
}
