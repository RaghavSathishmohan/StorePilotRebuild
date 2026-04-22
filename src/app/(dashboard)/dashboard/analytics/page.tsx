'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/components/dashboard/store-provider'
import { getStoreAnalytics, getSalesTrend, getCategoryPerformance } from '@/app/actions/analytics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  Package,
  Receipt,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Users,
  Calendar,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react'

interface AnalyticsData {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  totalSales: number
  totalItemsSold: number
  averageOrderValue: number
  averageItemsPerTransaction: number
  totalProducts: number
  activeProducts: number
  inactiveProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalInventoryValue: number
  totalCostValue: number
  inventoryByCategory: Record<string, number>
  costByCategory: Record<string, number>
  salesByCategory: Record<string, number>
  salesByPaymentMethod: Record<string, number>
  topSellingProducts: { sku: string; name: string; quantity: number; revenue: number; profit: number }[]
  topRevenueProducts: { sku: string; name: string; quantity: number; revenue: number; profit: number }[]
  products: any[]
  sales: any[]
}

interface FlashcardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
  onClick: () => void
  isExpanded: boolean
}

function Flashcard({ title, value, subtitle, icon, color, onClick, isExpanded }: FlashcardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isExpanded ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 ${color} rounded-lg`}>{icon}</div>
        </div>
        <div className="flex items-center justify-end mt-4">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {isExpanded ? 'Click to collapse' : 'Click to expand'}
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { selectedStore } = useStore()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [salesTrend, setSalesTrend] = useState<{ date: string; amount: number }[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([])

  useEffect(() => {
    if (selectedStore) {
      loadAnalytics()
    }
  }, [selectedStore])

  async function loadAnalytics() {
    if (!selectedStore) return
    setLoading(true)
    try {
      const [data, trend, categories] = await Promise.all([
        getStoreAnalytics(selectedStore.id),
        getSalesTrend(selectedStore.id, 30),
        getCategoryPerformance(selectedStore.id),
      ])
      setAnalytics(data)
      setSalesTrend(trend)
      setCategoryPerformance(categories)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  if (!selectedStore) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">Please select a store first.</p>
      </div>
    )
  }

  if (loading || !analytics) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    )
  }

  const hasData = analytics.totalSales > 0 || analytics.totalProducts > 0

  if (!hasData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">Insights and metrics from your store data</p>
          </div>
        </div>
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Import your store data to see analytics. Go to the Data Import page to upload your CSV file.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/imports'}>
              Go to Data Import
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Click any card to explore detailed metrics</p>
        </div>
        <Button variant="outline" onClick={loadAnalytics}>
          Refresh Data
        </Button>
      </div>

      {/* Flashcard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <Flashcard
          title="Total Revenue"
          value={formatCurrency(analytics.totalRevenue)}
          subtitle={`${formatCurrency(analytics.grossProfit)} profit • ${analytics.grossMargin.toFixed(1)}% margin`}
          icon={<DollarSign className="h-6 w-6 text-emerald-600" />}
          color="bg-emerald-100"
          onClick={() => toggleCard('revenue')}
          isExpanded={expandedCard === 'revenue'}
        />

        {/* Sales Card */}
        <Flashcard
          title="Total Sales"
          value={formatNumber(analytics.totalSales)}
          subtitle={`${formatNumber(analytics.totalItemsSold)} items • ${formatCurrency(analytics.averageOrderValue)} AOV`}
          icon={<Receipt className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
          onClick={() => toggleCard('sales')}
          isExpanded={expandedCard === 'sales'}
        />

        {/* Products Card */}
        <Flashcard
          title="Products"
          value={formatNumber(analytics.totalProducts)}
          subtitle={`${analytics.activeProducts} active • ${analytics.lowStockProducts} low stock`}
          icon={<Package className="h-6 w-6 text-purple-600" />}
          color="bg-purple-100"
          onClick={() => toggleCard('products')}
          isExpanded={expandedCard === 'products'}
        />

        {/* Inventory Value Card */}
        <Flashcard
          title="Inventory Value"
          value={formatCurrency(analytics.totalInventoryValue)}
          subtitle={`${formatCurrency(analytics.totalCostValue)} cost`}
          icon={<ShoppingCart className="h-6 w-6 text-amber-600" />}
          color="bg-amber-100"
          onClick={() => toggleCard('inventory')}
          isExpanded={expandedCard === 'inventory'}
        />

        {/* Category Performance Card */}
        <Flashcard
          title="Top Category"
          value={Object.entries(analytics.salesByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
          subtitle={`${Object.keys(analytics.salesByCategory).length} categories`}
          icon={<BarChart3 className="h-6 w-6 text-rose-600" />}
          color="bg-rose-100"
          onClick={() => toggleCard('categories')}
          isExpanded={expandedCard === 'categories'}
        />

        {/* Payment Methods Card */}
        {(() => {
          const totalPayment = Object.values(analytics.salesByPaymentMethod).reduce((a, b) => a + b, 0)
          const topMethod = Object.entries(analytics.salesByPaymentMethod).sort((a, b) => b[1] - a[1])[0]
          const topMethodPercent = topMethod && totalPayment > 0 ? (topMethod[1] / totalPayment) * 100 : 0
          return (
            <Flashcard
              title="Payment Methods"
              value={Object.keys(analytics.salesByPaymentMethod).length.toString()}
              subtitle={`${topMethod?.[0] || 'N/A'} ${topMethodPercent.toFixed(0)}%`}
              icon={<CreditCard className="h-6 w-6 text-cyan-600" />}
              color="bg-cyan-100"
              onClick={() => toggleCard('payments')}
              isExpanded={expandedCard === 'payments'}
            />
          )
        })()}

        {/* Top Product Card */}
        <Flashcard
          title="Top Product"
          value={analytics.topSellingProducts[0]?.name || 'N/A'}
          subtitle={`${analytics.topSellingProducts[0]?.quantity || 0} sold • ${formatCurrency(analytics.topSellingProducts[0]?.revenue || 0)}`}
          icon={<TrendingUp className="h-6 w-6 text-indigo-600" />}
          color="bg-indigo-100"
          onClick={() => toggleCard('topProducts')}
          isExpanded={expandedCard === 'topProducts'}
        />

        {/* Stock Alerts Card */}
        <Flashcard
          title="Stock Alerts"
          value={(analytics.lowStockProducts + analytics.outOfStockProducts).toString()}
          subtitle={`${analytics.outOfStockProducts} out of stock • ${analytics.lowStockProducts} low stock`}
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          color="bg-red-100"
          onClick={() => toggleCard('stockAlerts')}
          isExpanded={expandedCard === 'stockAlerts'}
        />
      </div>

      {/* Expanded Card Details */}
      {expandedCard && (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {expandedCard === 'revenue' && <><DollarSign className="h-5 w-5" /> Revenue Details</>}
                {expandedCard === 'sales' && <><Receipt className="h-5 w-5" /> Sales Breakdown</>}
                {expandedCard === 'products' && <><Package className="h-5 w-5" /> Product Catalog</>}
                {expandedCard === 'inventory' && <><ShoppingCart className="h-5 w-5" /> Inventory Analysis</>}
                {expandedCard === 'categories' && <><BarChart3 className="h-5 w-5" /> Category Performance</>}
                {expandedCard === 'payments' && <><CreditCard className="h-5 w-5" /> Payment Methods</>}
                {expandedCard === 'topProducts' && <><TrendingUp className="h-5 w-5" /> Top Products</>}
                {expandedCard === 'stockAlerts' && <><AlertTriangle className="h-5 w-5" /> Stock Alerts</>}
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpandedCard(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {/* Revenue Details */}
            {expandedCard === 'revenue' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.totalCost)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Gross Profit</p>
                      <p className={`text-2xl font-bold ${analytics.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(analytics.grossProfit)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Gross Margin</p>
                      <p className={`text-2xl font-bold ${analytics.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.grossMargin.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {salesTrend.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-4">30-Day Sales Trend</h4>
                    <div className="h-48 flex items-end gap-1">
                      {salesTrend.map((day, i) => {
                        const maxAmount = Math.max(...salesTrend.map(d => d.amount))
                        const height = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
                        const hasSales = day.amount > 0
                        return (
                          <div
                            key={i}
                            className={`flex-1 transition-colors rounded-t ${hasSales ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-200'}`}
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${day.date}: ${formatCurrency(day.amount)}`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{salesTrend[0]?.date}</span>
                      <span>{salesTrend[salesTrend.length - 1]?.date}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sales Breakdown */}
            {expandedCard === 'sales' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                      <p className="text-2xl font-bold">{formatNumber(analytics.totalSales)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Items Sold</p>
                      <p className="text-2xl font-bold">{formatNumber(analytics.totalItemsSold)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.averageOrderValue)}</p>
                    </CardContent>
                  </Card>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Average Items per Transaction</TableCell>
                      <TableCell className="text-right">{analytics.averageItemsPerTransaction.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Revenue per Item</TableCell>
                      <TableCell className="text-right">{formatCurrency(analytics.totalItemsSold > 0 ? analytics.totalRevenue / analytics.totalItemsSold : 0)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Products Catalog */}
            {expandedCard === 'products' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-2xl font-bold">{formatNumber(analytics.totalProducts)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold text-green-600">{formatNumber(analytics.activeProducts)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Inactive</p>
                      <p className="text-2xl font-bold text-muted-foreground">{formatNumber(analytics.inactiveProducts)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Activation Rate</p>
                      <p className="text-2xl font-bold">
                        {analytics.totalProducts > 0 ? ((analytics.activeProducts / analytics.totalProducts) * 100).toFixed(1) : 0}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {Object.entries(analytics.salesByCategory).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-4">Sales by Category</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(analytics.salesByCategory)
                          .sort((a, b) => b[1] - a[1])
                          .map(([category, revenue]) => (
                            <TableRow key={category}>
                              <TableCell>{category}</TableCell>
                              <TableCell className="text-right">{formatCurrency(revenue)}</TableCell>
                              <TableCell className="text-right">
                                {((revenue / analytics.totalRevenue) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Inventory Analysis */}
            {expandedCard === 'inventory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Inventory Value (Retail)</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.totalInventoryValue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Inventory Cost</p>
                      <p className="text-2xl font-bold">{formatCurrency(analytics.totalCostValue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Potential Profit</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics.totalInventoryValue - analytics.totalCostValue)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                {Object.entries(analytics.inventoryByCategory).length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Inventory Value</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(analytics.inventoryByCategory)
                        .sort((a, b) => b[1] - a[1])
                        .map(([category, value]) => (
                          <TableRow key={category}>
                            <TableCell>{category}</TableCell>
                            <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                            <TableCell className="text-right">
                              {((value / analytics.totalInventoryValue) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {/* Category Performance */}
            {expandedCard === 'categories' && (
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Items Sold</TableHead>
                      <TableHead className="text-right">Sales Revenue</TableHead>
                      <TableHead className="text-right">Inventory Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryPerformance.map((cat) => (
                      <TableRow key={cat.name}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">{formatNumber(cat.productCount)}</TableCell>
                        <TableCell className="text-right">{formatNumber(cat.itemsSold)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.salesRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cat.inventoryValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Payment Methods */}
            {expandedCard === 'payments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const totalPaymentAmount = Object.values(analytics.salesByPaymentMethod).reduce((a, b) => a + b, 0)
                    return Object.entries(analytics.salesByPaymentMethod)
                      .sort((a, b) => b[1] - a[1])
                      .map(([method, amount]) => {
                        const percentage = totalPaymentAmount > 0 ? (amount / totalPaymentAmount) * 100 : 0
                        return (
                          <Card key={method}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground capitalize">
                                  {method.replace(/_/g, ' ')}
                                </span>
                                <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                              </div>
                              <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
                              <Progress value={percentage} className="mt-3" />
                            </CardContent>
                          </Card>
                        )
                      })
                  })()}
                </div>
              </div>
            )}

            {/* Top Products */}
            {expandedCard === 'topProducts' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Selling by Quantity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.topSellingProducts.slice(0, 10).map((product) => (
                            <TableRow key={product.sku}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{product.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Selling by Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.topRevenueProducts.slice(0, 10).map((product) => (
                            <TableRow key={product.sku}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                              <TableCell className={`text-right ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(product.profit)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Stock Alerts */}
            {expandedCard === 'stockAlerts' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="text-sm text-red-700">Out of Stock</p>
                          <p className="text-2xl font-bold text-red-900">{analytics.outOfStockProducts}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                        <div>
                          <p className="text-sm text-yellow-700">Low Stock</p>
                          <p className="text-2xl font-bold text-yellow-900">{analytics.lowStockProducts}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
