'use server'

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type InsightType =
  | 'high_revenue_product'
  | 'low_stock_alert'
  | 'trending_product'
  | 'slow_mover'
  | 'profit_opportunity'
  | 'inventory_risk'

interface Insight {
  insight_type: InsightType
  title: string
  description: string
  product_id?: string
  product_name?: string
  metric_value: number
  metric_unit: string
  severity: 'info' | 'warning' | 'critical'
  action_recommended: string
}

// Generate insights for a store
export async function generateInsights(storeId: string): Promise<Insight[]> {
  const supabase = await createServerSupabaseClient()
  const insights: Insight[] = []

  // Get products with sales data
  interface ProductData {
    id: string;
    name: string;
    sku: string;
    selling_price: number | null;
    cost_price: number | null;
    stock: number | null;
  }

  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      selling_price,
      cost_price,
      stock
    `)
    .eq('store_id', storeId)
    .eq('is_active', true)

  const typedProducts = (products || []) as ProductData[]

  if (typedProducts.length === 0) {
    return insights
  }

  // Get sales data for products
  // First, get receipt IDs for this store in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: receiptIds } = await supabase
    .from('sales_receipts')
    .select('id')
    .eq('store_id', storeId)
    .gte('transaction_date', thirtyDaysAgo)

  const receiptIdList = receiptIds?.map((r: { id: string }) => r.id) || []

  // Then get line items for those receipts
  interface SalesLineItem {
    product_id: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
  }

  let salesData: SalesLineItem[] = []
  if (receiptIdList.length > 0) {
    const { data: lineItems } = await supabase
      .from('sale_line_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        total_amount
      `)
      .in('receipt_id', receiptIdList)
    salesData = (lineItems || []) as SalesLineItem[]
  }

  // Calculate metrics per product
  const productMetrics = typedProducts.map((product) => {
    const productSales =
      salesData.filter((s) => s.product_id === product.id) || []
    const totalRevenue = productSales.reduce(
      (sum, s) => sum + (s.total_amount || 0),
      0
    )
    const totalQuantity = productSales.reduce(
      (sum, s) => sum + (s.quantity || 0),
      0
    )
    const profit = product.selling_price && product.cost_price
      ? (product.selling_price - product.cost_price) * totalQuantity
      : 0

    return {
      ...product,
      totalRevenue,
      totalQuantity,
      profit,
    }
  })

  // Identify high-revenue products (top 10%)
  const sortedByRevenue = [...productMetrics].sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  )
  const topRevenueThreshold = sortedByRevenue[Math.floor(sortedByRevenue.length * 0.1)]
    ?.totalRevenue || 0

  sortedByRevenue.slice(0, 5).forEach((product) => {
    if (product.totalRevenue > 0) {
      insights.push({
        insight_type: 'high_revenue_product',
        title: `High Revenue: ${product.name}`,
        description: `This product generated $${product.totalRevenue.toFixed(2)} in revenue over the last 30 days.`,
        product_id: product.id,
        product_name: product.name,
        metric_value: product.totalRevenue,
        metric_unit: 'dollars',
        severity: 'info',
        action_recommended: 'Consider increasing stock levels to avoid stockouts.',
      })
    }
  })

  // Identify low stock alerts
  typedProducts.forEach((product) => {
    if (product.stock && product.stock <= 10) {
      insights.push({
        insight_type: 'low_stock_alert',
        title: `Low Stock: ${product.name}`,
        description: `Only ${product.stock} units remaining in stock.`,
        product_id: product.id,
        product_name: product.name,
        metric_value: product.stock,
        metric_unit: 'units',
        severity: product.stock <= 5 ? 'critical' : 'warning',
        action_recommended: 'Reorder soon to avoid stockouts.',
      })
    }
  })

  // Identify trending products (high sales velocity)
  const trendingProducts = productMetrics
    .filter((p) => p.totalQuantity > 10)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 3)

  trendingProducts.forEach((product) => {
    insights.push({
      insight_type: 'trending_product',
      title: `Trending: ${product.name}`,
      description: `Sold ${product.totalQuantity} units in the last 30 days. Consider featuring this item.`,
      product_id: product.id,
      product_name: product.name,
      metric_value: product.totalQuantity,
      metric_unit: 'units',
      severity: 'info',
      action_recommended: 'Feature this product prominently.',
    })
  })

  // Identify slow movers (no sales in last 30 days)
  const slowMovers = productMetrics.filter((p) => p.totalQuantity === 0)
  if (slowMovers.length > 0) {
    slowMovers.slice(0, 5).forEach((product) => {
      insights.push({
        insight_type: 'slow_mover',
        title: `Slow Mover: ${product.name}`,
        description: 'No sales recorded in the last 30 days.',
        product_id: product.id,
        product_name: product.name,
        metric_value: 0,
        metric_unit: 'units',
        severity: 'warning',
        action_recommended: 'Consider discounting or promoting this product.',
      })
    })
  }

  // Identify profit opportunities (high margin products)
  const highMarginProducts = productMetrics.filter(
    (p) =>
      p.profit > 0 &&
      p.cost_price &&
      p.selling_price &&
      (p.selling_price - p.cost_price) / p.cost_price > 0.5 // >50% margin
  )

  highMarginProducts.slice(0, 3).forEach((product) => {
    if (!product.selling_price || !product.cost_price) return
    const margin = ((product.selling_price - product.cost_price) / product.cost_price) * 100
    insights.push({
      insight_type: 'profit_opportunity',
      title: `High Margin: ${product.name}`,
      description: `This product has a ${margin.toFixed(0)}% profit margin.`,
      product_id: product.id,
      product_name: product.name,
      metric_value: margin,
      metric_unit: 'percent',
      severity: 'info',
      action_recommended: 'Promote this high-margin product more aggressively.',
    })
  })

  // Inventory risk (stock > 100 and no sales)
  const inventoryRisk = productMetrics.filter((p) => p.stock && p.stock > 100 && p.totalQuantity === 0)
  inventoryRisk.slice(0, 3).forEach((product) => {
    insights.push({
      insight_type: 'inventory_risk',
      title: `Excess Inventory: ${product.name}`,
      description: `${product.stock} units in stock with no recent sales.`,
      product_id: product.id,
      product_name: product.name,
      metric_value: product.stock || 0,
      metric_unit: 'units',
      severity: 'warning',
      action_recommended: 'Consider clearance pricing to free up capital.',
    })
  })

  return insights
}

// Save insights to database
export async function saveInsights(storeId: string, insights: Insight[]) {
  const supabase = await createServerSupabaseClient()

  // Delete old unactioned insights
  await supabase
    .from('os_analytics_insights')
    .delete()
    .eq('store_id', storeId)
    .eq('action_taken', false)
    .eq('dismissed', false)
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  // Insert new insights
  const insightsToInsert = insights.map((insight) => ({
    store_id: storeId,
    insight_type: insight.insight_type,
    title: insight.title,
    description: insight.description,
    product_id: insight.product_id,
    product_name: insight.product_name,
    metric_value: insight.metric_value,
    metric_unit: insight.metric_unit,
    severity: insight.severity,
    action_recommended: insight.action_recommended,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }))

  const supabaseClient = supabase as any
  const { error } = await supabaseClient
    .from('os_analytics_insights')
    .insert(insightsToInsert)

  if (error) {
    console.error('Error saving insights:', error)
    throw error
  }

  revalidatePath('/dashboard/os')
  revalidatePath('/dashboard/analytics')

  return { success: true, count: insights.length }
}

// Refresh insights for a store
export async function refreshInsights(storeId: string) {
  const insights = await generateInsights(storeId)
  return await saveInsights(storeId, insights)
}

// Dismiss an insight
export async function dismissInsight(insightId: string) {
  const supabase = await createServerSupabaseClient()
  const supabaseClient = supabase as any

  const { error } = await supabaseClient
    .from('os_analytics_insights')
    .update({ dismissed: true })
    .eq('id', insightId)

  if (error) {
    throw error
  }

  revalidatePath('/dashboard/os')
  return { success: true }
}

// Mark action as taken
export async function markInsightActioned(insightId: string) {
  const supabase = await createServerSupabaseClient()
  const supabaseClient = supabase as any

  const { error } = await supabaseClient
    .from('os_analytics_insights')
    .update({ action_taken: true })
    .eq('id', insightId)

  if (error) {
    throw error
  }

  revalidatePath('/dashboard/os')
  return { success: true }
}
