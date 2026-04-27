'use server'

import { createServiceClient } from '@/lib/supabase/admin'
import { checkStorePermission } from '@/lib/permissions'
import { createServerSupabaseClient } from '@/lib/supabase/admin'

/**
 * Get pre-computed store analytics from the database
 * This is more efficient than computing on-the-fly and ensures
 * data is available for all store members
 */
export async function getStoreAnalyticsSummary(storeId: string, date?: string) {
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
  const targetDate = date || new Date().toISOString().split('T')[0]

  // Get daily summary
  const { data: dailySummary } = await serviceClient
    .from('analytics_daily_summary')
    .select('*')
    .eq('store_id', storeId)
    .eq('summary_date', targetDate)
    .single()

  // Get category performance
  const { data: categoryPerformance } = await serviceClient
    .from('analytics_category_performance')
    .select('*')
    .eq('store_id', storeId)
    .is('summary_date', null)
    .order('sales_revenue', { ascending: false })

  // Get top products
  const { data: topProducts } = await serviceClient
    .from('analytics_product_performance')
    .select('*')
    .eq('store_id', storeId)
    .is('summary_date', null)
    .order('revenue_rank', { ascending: true })
    .limit(10)

  // Get user preferences for this store
  const { data: userPrefs } = await serviceClient
    .from('analytics_user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .eq('store_id', storeId)
    .single()

  return {
    summary: dailySummary,
    categories: categoryPerformance || [],
    topProducts: topProducts || [],
    userPreferences: userPrefs
  }
}

/**
 * Refresh analytics for a store
 * Only admins can trigger this
 */
export async function refreshStoreAnalytics(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const { allowed } = await checkStorePermission(storeId, user.id, 'admin')
  if (!allowed) {
    throw new Error('You need admin permissions to refresh analytics')
  }

  const serviceClient = createServiceClient()

  // Call the database function to compute analytics
  // @ts-ignore - Database function types
  const { data, error } = await serviceClient.rpc('compute_store_analytics', {
    p_store_id: storeId,
    p_computed_by: user.id
  })

  if (error) {
    console.error('Error computing analytics:', error)
    throw new Error('Failed to compute analytics')
  }

  const result = data as { daily_records?: number; category_records?: number; product_records?: number } | null

  return {
    success: true,
    dailyRecords: result?.daily_records || 0,
    categoryRecords: result?.category_records || 0,
    productRecords: result?.product_records || 0
  }
}

/**
 * Get analytics trend for a date range
 */
export async function getAnalyticsTrend(storeId: string, days: number = 30) {
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

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: summaries } = await serviceClient
    .from('analytics_daily_summary')
    .select('*')
    .eq('store_id', storeId)
    .gte('summary_date', startDate.toISOString().split('T')[0])
    .lte('summary_date', endDate.toISOString().split('T')[0])
    .order('summary_date', { ascending: true })

  return summaries || []
}

/**
 * Update user analytics preferences
 */
export async function updateAnalyticsPreferences(
  storeId: string,
  preferences: {
    defaultDateRange?: number
    pinnedMetrics?: string[]
    hiddenCards?: string[]
    emailAlertsEnabled?: boolean
    alertThresholdLowStock?: number
    alertThresholdSalesDrop?: number
  }
) {
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

  // Map camelCase preferences to snake_case database columns
  const dbPreferences = {
    user_id: user.id,
    store_id: storeId,
    default_date_range: preferences.defaultDateRange,
    pinned_metrics: preferences.pinnedMetrics,
    hidden_cards: preferences.hiddenCards,
    email_alerts_enabled: preferences.emailAlertsEnabled,
    alert_threshold_low_stock: preferences.alertThresholdLowStock,
    alert_threshold_sales_drop: preferences.alertThresholdSalesDrop,
    updated_at: new Date().toISOString()
  }

  const { error } = await (serviceClient as any)
    .from('analytics_user_preferences')
    .upsert(dbPreferences, {
      onConflict: 'user_id,store_id'
    })

  if (error) {
    console.error('Error updating preferences:', error)
    throw new Error('Failed to update preferences')
  }

  return { success: true }
}

/**
 * Get computation history for a store
 */
export async function getAnalyticsComputationHistory(storeId: string, limit: number = 10) {
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

  const { data: history } = await serviceClient
    .from('analytics_computation_log')
    .select(`
      *,
      computed_by:profiles(full_name)
    `)
    .eq('store_id', storeId)
    .order('started_at', { ascending: false })
    .limit(limit)

  return history || []
}
