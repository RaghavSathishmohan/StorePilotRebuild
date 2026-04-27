# StorePilot Analytics Setup

## Overview

This update fixes the top category metric calculation and introduces a new analytics infrastructure that properly handles **user-specific data with store-shared access**. All store members (owner, admin, manager, staff) can view the same analytics data for their store.

## Changes Made

### 1. Fixed Top Category Calculation (`src/app/actions/analytics.ts`)

**Problem:** The top category metric was showing incorrect values because:
- Category sales were being attributed incorrectly when products didn't have proper category associations
- The sales aggregation logic didn't properly handle products without categories

**Solution:**
- Fixed the `getStoreAnalytics` function to properly calculate `salesByCategory`
- Fixed `getCategoryPerformance` to use proper joins and correctly map products to categories
- Added explicit handling for "Uncategorized" products
- Added a new `topCategory` object in the return value with name, revenue, and count

### 2. New Database Tables (`supabase/migrations/20250622_analytics_tables.sql`)

Created 5 new tables for efficient analytics storage:

#### `analytics_daily_summary`
- Pre-computed daily metrics for each store
- Stores revenue, sales counts, inventory values, product counts
- RLS: Store members can view, admins can manage

#### `analytics_category_performance`
- Category-level metrics (products, inventory value, sales revenue, items sold)
- Supports time-based filtering with `summary_date`
- RLS: Store members can view, admins can manage

#### `analytics_product_performance`
- Product-level performance metrics
- Tracks sales quantity, revenue, profit, and rankings
- RLS: Store members can view, admins can manage

#### `analytics_user_preferences`
- Per-user analytics dashboard preferences
- Stores pinned metrics, date ranges, alert thresholds
- RLS: Users can only access their own preferences

#### `analytics_computation_log`
- Tracks when analytics were computed
- Stores duration, records processed, errors
- RLS: Store members can view, admins can manage

### 3. Database Function

#### `compute_store_analytics(store_id UUID, computed_by UUID)`
- Efficiently computes all analytics metrics in a single database call
- Returns counts of: daily records, category records, product records
- Automatically updates existing records (upsert behavior)

### 4. New Server Actions (`src/app/actions/analytics-new.ts`)

- `getStoreAnalyticsSummary()` - Get pre-computed analytics
- `refreshStoreAnalytics()` - Trigger analytics computation (admin only)
- `getAnalyticsTrend()` - Get historical trend data
- `updateAnalyticsPreferences()` - Update user dashboard preferences
- `getAnalyticsComputationHistory()` - View computation history

### 5. Updated Analytics Dashboard (`src/app/(dashboard)/dashboard/analytics/page.tsx`)

- Updated to use the new `topCategory` property
- Now shows category revenue in the flashcard subtitle
- Fixed type definitions to include the new analytics data structure

## Data Access Model

The analytics system follows this access pattern:

```
User A (Owner)  ──┐
User B (Admin)   ──┼──▶  Store Analytics Data  ◀──  Database RLS Policies
User C (Manager) ──┤      (Shared among members)
User D (Staff)   ──┘
```

- **Store owner** creates the store and is automatically a member
- **All store members** can view analytics (via `is_store_member()` check)
- **Store admins** can trigger analytics refresh/computation
- **User preferences** are private to each user (e.g., which cards they pin)

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Link your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option 2: Using psql

```bash
# Set your database URL
export SUPABASE_DATABASE_URL="postgresql://..."

# Run the migration
psql $SUPABASE_DATABASE_URL -f supabase/migrations/20250622_analytics_tables.sql
```

### Option 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open `supabase/migrations/20250622_analytics_tables.sql`
4. Run the SQL

## Computing Analytics

After running the migration, compute initial analytics:

```typescript
import { refreshStoreAnalytics } from '@/app/actions/analytics-new'

// Call this once after migration
await refreshStoreAnalytics('your-store-id')
```

Or use the database function directly:

```sql
SELECT * FROM compute_store_analytics('your-store-id', 'your-user-id');
```

## Next Steps

1. **Run the migration** to create the analytics tables
2. **Compute initial analytics** for existing stores
3. **Set up a cron job** (optional) to refresh analytics periodically:
   ```sql
   -- Refresh analytics daily at 2 AM
   SELECT cron.schedule('refresh-analytics', '0 2 * * *', $$
     SELECT compute_store_analytics(store_id, 'system')
     FROM stores
   $$);
   ```

## Security

All tables have Row Level Security (RLS) policies:
- `is_store_member(store_id, auth.uid())` - Check if user has any role in the store
- `has_store_role(store_id, auth.uid(), 'admin')` - Check for specific role level

This ensures users can only access data for stores they are members of.
