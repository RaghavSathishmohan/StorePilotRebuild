'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from 'lucide-react'
import { clearAllStoreData } from '@/app/actions/seed-data'

interface ClearDataButtonProps {
  storeId: string
}

export function ClearDataButton({ storeId }: ClearDataButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [step, setStep] = useState(1) // Step 1: Warning, Step 2: Confirmation code, Step 3: Confirm
  const [confirmationCode, setConfirmationCode] = useState('')
  const [expectedCode] = useState(`DELETE-${storeId.slice(0, 8).toUpperCase()}`)
  const [isClearing, setIsClearing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; results?: any; error?: string } | null>(null)

  const reset = () => {
    setStep(1)
    setConfirmationCode('')
    setResult(null)
    setShowDialog(false)
  }

  const handleClear = async () => {
    if (confirmationCode !== expectedCode) {
      setResult({ success: false, error: 'Confirmation code does not match' })
      return
    }

    setIsClearing(true)
    try {
      const response = await clearAllStoreData(storeId, confirmationCode)
      setResult(response)
    } catch (error) {
      console.error('Clear data error:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear data'
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanent actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Clear All Store Data</h4>
              <p className="text-sm text-muted-foreground">
                Delete all products, sales, categories, and import history
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          {!result ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                  {step === 1 && 'Warning: Destructive Action'}
                  {step === 2 && 'Enter Confirmation Code'}
                  {step === 3 && 'Final Confirmation'}
                </DialogTitle>
                <DialogDescription>
                  {step === 1 && 'This will permanently delete all data for this store.'}
                  {step === 2 && 'Type the confirmation code to verify you understand the consequences.'}
                  {step === 3 && 'Click the button below to permanently delete all data.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {step === 1 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm text-red-800 font-medium">
                      The following will be permanently deleted:
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                      <li>All products ({storeId})</li>
                      <li>All sales receipts and line items</li>
                      <li>All product categories</li>
                      <li>All import history and logs</li>
                    </ul>
                    <p className="text-sm text-red-800 font-medium pt-2">
                      This action cannot be undone.
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        Type this code to confirm:
                      </p>
                      <code className="block text-lg font-mono font-bold text-amber-900 mt-1">
                        {expectedCode}
                      </code>
                    </div>
                    <Input
                      placeholder="Enter confirmation code..."
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      className="font-mono"
                      autoFocus
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-red-800">
                      Last chance. This is irreversible.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {step > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      disabled={isClearing}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={reset}
                    disabled={isClearing}
                    className="ml-auto"
                  >
                    Cancel
                  </Button>
                  {step < 3 ? (
                    <Button
                      variant={step === 1 ? "default" : "destructive"}
                      onClick={() => setStep(step + 1)}
                      disabled={step === 2 && confirmationCode !== expectedCode}
                    >
                      {step === 1 ? 'I Understand' : 'Continue'}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={handleClear}
                      disabled={isClearing}
                    >
                      {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isClearing ? 'Clearing...' : 'Permanently Delete All Data'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? 'Data Cleared' : 'Error'}
                </DialogTitle>
                <DialogDescription>
                  {result.success
                    ? 'All store data has been permanently deleted.'
                    : result.error}
                </DialogDescription>
              </DialogHeader>

              {result.success && result.results && (
                <div className="bg-muted rounded-lg p-4 space-y-2 my-4">
                  <p className="font-medium text-sm">Deleted:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>{result.results.deleted.products} products</li>
                    <li>{result.results.deleted.salesReceipts} sales receipts</li>
                    <li>{result.results.deleted.saleLineItems} sale line items</li>
                    <li>{result.results.deleted.categories} categories</li>
                    <li>{result.results.deleted.imports} imports</li>
                  </ul>
                  {result.results.errors?.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                      <p className="text-xs text-red-700 font-medium">Errors:</p>
                      <ul className="text-xs text-red-600 list-disc list-inside">
                        {result.results.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={reset} className="w-full">
                Close
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
