import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Beaker,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  Database
} from 'lucide-react'
import Link from 'next/link'
import { SeedDataButton } from '@/components/os/seed-data-button'

export const metadata = {
  title: 'Product Command Center | StorePilot',
  description: 'Build, test, and ship with confidence',
}

async function getTestResults() {
  const supabase = await createServerSupabaseClient()

  const { data: results } = await supabase
    .from('os_test_results')
    .select('*')
    .order('run_at', { ascending: false })
    .limit(20)

  return results || []
}

async function getAnalyticsInsights() {
  const supabase = await createServerSupabaseClient()

  const { data: insights } = await supabase
    .from('os_analytics_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  return insights || []
}

async function getAgentActivity() {
  const supabase = await createServerSupabaseClient()

  const { data: activity } = await supabase
    .from('os_agent_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return activity || []
}

async function getDecisionQueue() {
  const supabase = await createServerSupabaseClient()

  const { data: queue } = await supabase
    .from('os_decision_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  return queue || []
}

async function getUserStores(userId: string) {
  const supabase = await createServerSupabaseClient()

  // Get stores the user has access to via store_members join
  const { data: stores } = await supabase
    .from('stores')
    .select(`
      *,
      store_members!inner(role)
    `)
    .eq('store_members.user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  return stores || []
}

export default async function OSDashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const stores = await getUserStores(user.id)
  const storeId = stores[0]?.id || 'demo-store-id'

  const [testResults, insights, activity, decisionQueue] = await Promise.all([
    getTestResults(),
    getAnalyticsInsights(),
    getAgentActivity(),
    getDecisionQueue(),
  ])

  const lastRun = testResults[0]
  const passCount = testResults.filter(r => r.status === 'passed').length
  const failCount = testResults.filter(r => r.status === 'failed').length
  const passRate = testResults.length > 0 ? Math.round((passCount / testResults.length) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Command Center</h1>
        <p className="text-muted-foreground">
          Build, test, and ship StorePilot with confidence
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Pass Rate</CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
            <p className="text-xs text-muted-foreground">
              {passCount} passed, {failCount} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Use demo data below
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Decisions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decisionQueue.length}</div>
            <p className="text-xs text-muted-foreground">
              Items need your approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">
              Auto-generated opportunities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Test Run</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastRun ? new Date(lastRun.run_at).toLocaleTimeString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastRun ? new Date(lastRun.run_at).toLocaleDateString() : 'No runs yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Demo Data Section */}
      <SeedDataButton storeId={storeId} />

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="insights">Analytics Insights</TabsTrigger>
          <TabsTrigger value="queue">Decision Queue ({decisionQueue.length})</TabsTrigger>
          <TabsTrigger value="activity">Agent Activity</TabsTrigger>
        </TabsList>

        {/* Test Results */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
              <CardDescription>
                Automated test results from Playwright E2E tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test results yet. Run tests with <code className="bg-muted px-2 py-1 rounded">npm run test:e2e</code>
                </div>
              ) : (
                <div className="space-y-2">
                  {testResults.slice(0, 10).map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {result.status === 'passed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : result.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium">{result.test_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {result.test_type} • {result.related_feature}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={result.status === 'passed' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {result.duration_ms}ms
                        </span>
                        {result.screenshot_url && (
                          <Link href={result.screenshot_url} target="_blank">
                            <Button variant="ghost" size="sm">Screenshot</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Insights */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Auto-Generated Insights
              </CardTitle>
              <CardDescription>
                Opportunities and alerts from your store data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No insights yet. Insights are generated from your product and sales data.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`p-4 border rounded-lg ${
                        insight.severity === 'critical'
                          ? 'border-red-200 bg-red-50'
                          : insight.severity === 'warning'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {insight.insight_type === 'high_revenue_product' ? (
                            <DollarSign className="h-5 w-5 text-green-600" />
                          ) : insight.insight_type === 'low_stock_alert' ? (
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                          )}
                          <div>
                            <h4 className="font-semibold">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                            {insight.product_name && (
                              <p className="text-sm font-medium mt-1">
                                Product: {insight.product_name}
                              </p>
                            )}
                            {insight.metric_value && (
                              <p className="text-sm mt-1">
                                {insight.metric_unit === 'dollars'
                                  ? `$${insight.metric_value}`
                                  : insight.metric_value}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={
                              insight.severity === 'critical'
                                ? 'destructive'
                                : insight.severity === 'warning'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {insight.insight_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {insight.action_recommended && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm">
                            <span className="font-medium">Recommended Action:</span>{' '}
                            {insight.action_recommended}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decision Queue */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision Queue</CardTitle>
              <CardDescription>
                Items waiting for your approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {decisionQueue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>All caught up! No items need your approval.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {decisionQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{item.title}</h4>
                            <Badge
                              variant={
                                item.priority === 'urgent'
                                  ? 'destructive'
                                  : item.priority === 'high'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            From: {item.agent_name} •{' '}
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                          <Button size="sm">Approve</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Activity */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Activity</CardTitle>
              <CardDescription>
                Recent actions from your automated agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No agent activity yet. Agents run when you trigger them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activity.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{act.agent_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {act.action_type} • {act.status}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {act.duration_ms ? `${act.duration_ms}ms` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
