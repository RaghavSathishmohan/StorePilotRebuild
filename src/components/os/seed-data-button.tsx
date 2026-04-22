'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { seedDemoData, clearDemoData } from '@/app/actions/seed-data'
import { Database, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface SeedDataButtonProps {
  storeId: string
}

export function SeedDataButton({ storeId }: SeedDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    productsCreated?: number
    salesCreated?: number
    errors?: string[]
    message?: string
  } | null>(null)

  const handleSeed = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const data = await seedDemoData(storeId)
      setResult({
        productsCreated: data.productsCreated,
        salesCreated: data.salesCreated,
        errors: data.errors,
        message: `Created ${data.productsCreated} products and ${data.salesCreated} sale line items`,
      })
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : 'Failed to seed data',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = async () => {
    if (!confirm('Are you sure? This will delete all demo products and sales.')) {
      return
    }

    setIsLoading(true)
    try {
      await clearDemoData(storeId)
      setResult({
        message: 'Demo data cleared successfully',
      })
    } catch (error) {
      setResult({
        message: error instanceof Error ? error.message : 'Failed to clear data',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Demo Data
        </CardTitle>
        <CardDescription>
          Populate your store with sample products and sales data for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleSeed}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Seed Demo Data
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Demo Data
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${
            result.errors?.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-2">
              {result.errors?.length ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <p className="font-medium">
                {result.message}
              </p>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 text-sm text-yellow-700">
                <p className="font-medium">Warnings:</p>
                <ul className="list-disc pl-5 mt-1">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p className="font-medium">What gets created:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>23 products across Beverages, Snacks, Tobacco, Household, and Dairy</li>
            <li>Varying stock levels (some low for testing alerts)</li>
            <li>10 sample sales transactions over the last 10 days</li>
            <li>Categories automatically created</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
