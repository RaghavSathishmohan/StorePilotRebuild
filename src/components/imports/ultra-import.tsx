'use client'

import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FileUpload } from './file-upload'
import { suggestColumnMapping } from '@/app/actions/imports'
import { initSuperFastImport, processMegaBatch, finalizeSuperFastImport } from '@/app/actions/import-superfast'
import { CheckCircle, AlertCircle, Zap, Clock, TrendingUp, RotateCcw } from 'lucide-react'

const BATCH_SIZE = 10000 // Process 10k rows at a time (smaller batches for server action limits)

interface UltraImportProps {
  storeId: string
}

interface ImportStats {
  totalRows: number
  processedRows: number
  startTime: number
  estimatedTimeRemaining: number
  currentSpeed: number
}

export function UltraImport({ storeId }: UltraImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'complete' | 'error'>('upload')
  const [fileName, setFileName] = useState('')
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<{ csvColumn: string; dbField: string }[]>([])
  const [stats, setStats] = useState<ImportStats>({
    totalRows: 0,
    processedRows: 0,
    startTime: 0,
    estimatedTimeRemaining: 0,
    currentSpeed: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [finalResult, setFinalResult] = useState<{ processed: number; successful: number; failed: number; duration: number } | null>(null)

  const abortRef = useRef(false)
  const fileRef = useRef<File | null>(null)

  const AVAILABLE_FIELDS = [
    { value: 'sku', label: 'SKU' },
    { value: 'name', label: 'Product Name' },
    { value: 'category', label: 'Category' },
    { value: 'barcode', label: 'Barcode' },
    { value: 'selling_price', label: 'Selling Price' },
    { value: 'cost_price', label: 'Cost Price' },
    { value: 'stock', label: 'Stock' },
    { value: 'receipt_number', label: 'Receipt Number' },
    { value: 'transaction_date', label: 'Transaction Date' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'unit_price', label: 'Unit Price' },
    { value: 'discount_amount', label: 'Discount Amount' },
    { value: 'tax_amount', label: 'Tax Amount' },
    { value: 'payment_method', label: 'Payment Method' },
    { value: 'customer_name', label: 'Customer Name' },
    { value: 'is_active', label: 'Is Active' },
    { value: 'min_stock_level', label: 'Min Stock Level' },
    { value: 'reorder_point', label: 'Reorder Point' },
    { value: 'supplier_name', label: 'Supplier Name' },
  ]

  const handleFileSelect = async (file: File, content: string) => {
    setFileName(file.name)
    fileRef.current = file

    // Quick parse just to get headers
    const result = Papa.parse(content, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
    })

    const headers = result.meta.fields || []
    setParsedHeaders(headers)

    // Estimate total rows
    const totalRows = (content.match(/\n/g) || []).length
    setStats(prev => ({ ...prev, totalRows }))

    // Auto-suggest column mapping
    try {
      const mapping = await suggestColumnMapping(headers, 'unified')
      setColumnMapping(mapping.map(m => ({ csvColumn: m.csvColumn, dbField: m.dbField })))
    } catch (e) {
      console.error('Error suggesting mapping:', e)
    }

    setStep('mapping')
  }

  const transformValue = (value: string, field: string): unknown => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null

    if (['cost_price', 'selling_price', 'unit_price', 'discount_amount', 'tax_amount', 'stock'].includes(field)) {
      const num = parseFloat(trimmed.replace(/[$,]/g, ''))
      return isNaN(num) ? null : num
    }

    if (field === 'is_active') {
      return ['true', '1', 'yes', 'y'].includes(trimmed.toLowerCase())
    }

    if (field === 'transaction_date') {
      const date = new Date(trimmed)
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
    }

    return trimmed
  }

  const handleStartImport = async () => {
    if (!fileRef.current || columnMapping.length === 0) return

    setStep('processing')
    setStats(prev => ({ ...prev, startTime: Date.now() }))
    abortRef.current = false

    try {
      // Initialize import with just metadata (no file content)
      const { importId: newImportId, categoryMap, productMap } = await initSuperFastImport(
        storeId,
        fileName,
        fileRef.current.size,
        stats.totalRows,
        columnMapping
      )

      // Parse and process file in streaming fashion
      const fieldMap = new Map(columnMapping.map(m => [m.csvColumn, m.dbField]))
      let processedCount = 0
      let successfulCount = 0
      let failedCount = 0

      // Current batch data
      let currentBatch: {
        receipts: any[]
        lineItems: any[]
        products: any[]
        categories: string[]
        inventorySnapshots: any[]
      } = {
        receipts: [],
        lineItems: [],
        products: [],
        categories: [],
        inventorySnapshots: [],
      }

      // Receipt tracking for the batch
      const receiptMap = new Map<string, { receipt_number: string; transaction_date: string; payment_method: string; items: any[] }>()

      // Process current batch to server
      const sendBatchToServer = async (): Promise<boolean> => {
        if (currentBatch.products.length === 0 && receiptMap.size === 0) return true

        // Convert receiptMap to array
        currentBatch.receipts = Array.from(receiptMap.values())

        try {
          const result = await processMegaBatch(
            storeId,
            newImportId,
            currentBatch,
            { categoryMap, productMap }
          )

          // Reset batch
          receiptMap.clear()
          currentBatch = { receipts: [], lineItems: [], products: [], categories: [], inventorySnapshots: [] }

          if (result.success) {
            successfulCount += result.processed
            return true
          } else {
            failedCount += currentBatch.receipts.length + currentBatch.products.length
            return false
          }
        } catch (err) {
          console.error('Batch error:', err)
          failedCount += currentBatch.receipts.length + currentBatch.products.length
          receiptMap.clear()
          currentBatch = { receipts: [], lineItems: [], products: [], categories: [], inventorySnapshots: [] }
          return false
        }
      }

      // Read file in chunks and stream parse
      const file = fileRef.current
      const chunkSize = 1024 * 1024 // 1MB chunks
      let offset = 0
      let leftover = ''

      while (offset < file.size && !abortRef.current) {
        const chunk = await file.slice(offset, offset + chunkSize).text()
        const text = leftover + chunk

        // Find last newline to avoid splitting a row
        const lastNewline = text.lastIndexOf('\n')
        const processText = text.slice(0, lastNewline)
        leftover = text.slice(lastNewline + 1)

        // Parse this chunk
        const parseResult = Papa.parse(processText, {
          header: true,
          skipEmptyLines: true,
          delimiter: ',',
        })

        // Process each row
        for (const row of parseResult.data as any[]) {
          if (abortRef.current) break

          const data: Record<string, unknown> = {}
          for (const [csvColumn, value] of Object.entries(row)) {
            const dbField = fieldMap.get(csvColumn)
            if (dbField && value !== undefined && value !== null) {
              data[dbField] = transformValue(String(value), dbField)
            }
          }

          const isSalesRow = data.receipt_number && String(data.receipt_number).trim() !== ''

          if (isSalesRow) {
            const receiptNum = String(data.receipt_number)

            if (!receiptMap.has(receiptNum)) {
              receiptMap.set(receiptNum, {
                receipt_number: receiptNum,
                transaction_date: String(data.transaction_date || new Date().toISOString()),
                payment_method: String(data.payment_method || 'other'),
                items: [],
              })
            }

            const receipt = receiptMap.get(receiptNum)!
            receipt.items.push({
              product_sku: String(data.sku || ''),
              product_name: String(data.name || 'Unknown'),
              quantity: Number(data.quantity || 1),
              unit_price: Number(data.unit_price || data.selling_price || 0),
              discount_amount: Number(data.discount_amount || 0),
              tax_amount: Number(data.tax_amount || 0),
              cost_price: Number(data.cost_price || 0),
              total_amount: (Number(data.unit_price || data.selling_price || 0) * Number(data.quantity || 1)) - Number(data.discount_amount || 0),
            })
          } else {
            // Product row
            if (!data.sku) continue

            const productData = {
              store_id: storeId,
              sku: String(data.sku),
              name: String(data.name || ''),
              description: data.description || null,
              category_name: data.category || null,
              barcode: data.barcode || null,
              cost_price: data.cost_price || null,
              selling_price: data.selling_price || 0,
              is_active: data.is_active !== false,
              stock: data.stock || 0,
            }

            if (data.category) {
              currentBatch.categories.push(String(data.category))
            }

            currentBatch.products.push(productData)

            if (data.stock && Number(data.stock) > 0) {
              currentBatch.inventorySnapshots.push({
                sku: String(data.sku),
                quantity: Number(data.stock),
                snapshot_date: new Date().toISOString().split('T')[0],
                notes: 'Imported',
              })
            }
          }

          processedCount++

          // Update stats every 1000 rows
          if (processedCount % 1000 === 0) {
            const elapsed = (Date.now() - stats.startTime) / 1000
            const speed = processedCount / elapsed
            const remaining = (stats.totalRows - processedCount) / speed

            setStats(prev => ({
              ...prev,
              processedRows: processedCount,
              currentSpeed: Math.round(speed),
              estimatedTimeRemaining: Math.round(remaining),
            }))
          }

          // Send batch when it gets large enough
          const batchSize = currentBatch.products.length + receiptMap.size
          if (batchSize >= BATCH_SIZE) {
            await sendBatchToServer()
          }
        }

        offset += chunkSize
      }

      // Process any remaining data
      if (leftover) {
        const finalParse = Papa.parse(leftover, {
          header: true,
          skipEmptyLines: true,
        })

        for (const row of finalParse.data as any[]) {
          // Same processing as above (simplified for final chunk)
          const data: Record<string, unknown> = {}
          for (const [csvColumn, value] of Object.entries(row)) {
            const dbField = fieldMap.get(csvColumn)
            if (dbField && value !== undefined) {
              data[dbField] = transformValue(String(value), dbField)
            }
          }

          if (data.receipt_number) {
            const receiptNum = String(data.receipt_number)
            if (!receiptMap.has(receiptNum)) {
              receiptMap.set(receiptNum, {
                receipt_number: receiptNum,
                transaction_date: String(data.transaction_date || new Date().toISOString()),
                payment_method: String(data.payment_method || 'other'),
                items: [],
              })
            }
            const receipt = receiptMap.get(receiptNum)!
            receipt.items.push({
              product_sku: String(data.sku || ''),
              product_name: String(data.name || 'Unknown'),
              quantity: Number(data.quantity || 1),
              unit_price: Number(data.unit_price || 0),
              discount_amount: Number(data.discount_amount || 0),
              tax_amount: Number(data.tax_amount || 0),
              cost_price: Number(data.cost_price || 0),
              total_amount: (Number(data.unit_price || 0) * Number(data.quantity || 1)) - Number(data.discount_amount || 0),
            })
          } else if (data.sku) {
            currentBatch.products.push({
              store_id: storeId,
              sku: String(data.sku),
              name: String(data.name || ''),
              category_name: data.category || null,
              selling_price: data.selling_price || 0,
              is_active: data.is_active !== false,
              stock: data.stock || 0,
            })
          }
          processedCount++
        }
      }

      // Send final batch
      await sendBatchToServer()

      // Finalize import
      await finalizeSuperFastImport(newImportId, {
        processed: processedCount,
        successful: successfulCount,
        failed: failedCount,
      })

      const totalDuration = (Date.now() - stats.startTime) / 1000

      setFinalResult({
        processed: processedCount,
        successful: successfulCount,
        failed: failedCount,
        duration: totalDuration,
      })

      setStep('complete')
      setShowCompleteDialog(true)
    } catch (err) {
      setError((err as Error).message)
      setStep('error')
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  const reset = () => {
    setStep('upload')
    setFileName('')
    setParsedHeaders([])
    setColumnMapping([])
    setStats({
      totalRows: 0,
      processedRows: 0,
      startTime: 0,
      estimatedTimeRemaining: 0,
      currentSpeed: 0,
    })
    setError(null)
    setShowCompleteDialog(false)
    setFinalResult(null)
    fileRef.current = null
    abortRef.current = false
  }

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              <CardTitle className="text-2xl">Ultra-Fast Import</CardTitle>
            </div>
            <CardDescription>
              Optimized for massive files (500k+ rows). Targets 1-2 minute import times.
              Uses streaming CSV parsing and bulk database operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-yellow-50 border-yellow-200">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Performance:</strong> Expect ~500k rows in 1-2 minutes.
                Processes in batches of {BATCH_SIZE.toLocaleString()} rows.
              </AlertDescription>
            </Alert>

            <FileUpload onFileSelect={handleFileSelect} maxSize={500} />

            <div className="text-center text-sm text-muted-foreground">
              <p>Supports files up to 500MB</p>
              <p className="mt-1">CSV format with headers required</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>
              Review and adjust the auto-detected column mappings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <p className="font-medium">{stats.totalRows.toLocaleString()} rows detected</p>
              <p className="text-sm text-muted-foreground">{parsedHeaders.length} columns found</p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-4">
              {parsedHeaders.map((header) => {
                const mapping = columnMapping.find(m => m.csvColumn === header)
                return (
                  <div key={header} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-mono text-sm">{header}</span>
                    <select
                      value={mapping?.dbField || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setColumnMapping(prev => {
                          const filtered = prev.filter(m => m.csvColumn !== header)
                          if (value) {
                            return [...filtered, { csvColumn: header, dbField: value }]
                          }
                          return filtered
                        })
                      }}
                      className="border rounded px-2 py-1 text-sm min-w-[200px]"
                    >
                      <option value="">-- Skip --</option>
                      {AVAILABLE_FIELDS.map(field => (
                        <option key={field.value} value={field.value}>{field.label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={handleStartImport}
                disabled={columnMapping.length === 0}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <Zap className="mr-2 h-4 w-4" />
                Start Ultra-Fast Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
              Importing...
            </CardTitle>
            <CardDescription>
              Processing {stats.totalRows.toLocaleString()} rows at ultra-high speed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.processedRows.toLocaleString()} / {stats.totalRows.toLocaleString()} rows</span>
                <span>{Math.round((stats.processedRows / stats.totalRows) * 100)}%</span>
              </div>
              <Progress value={(stats.processedRows / stats.totalRows) * 100} className="w-full" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <TrendingUp className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-700">{stats.currentSpeed.toLocaleString()}</p>
                <p className="text-xs text-yellow-600">rows/second</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{formatTime(stats.estimatedTimeRemaining)}</p>
                <p className="text-xs text-blue-600">remaining</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{stats.processedRows.toLocaleString()}</p>
                <p className="text-xs text-green-600">processed</p>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                Processing in batches of {BATCH_SIZE.toLocaleString()} rows.
                Database is receiving bulk inserts. Do not refresh the page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {step === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Import Failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={reset} variant="outline" className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              Import Complete!
            </DialogTitle>
            <DialogDescription>
              Your massive import finished successfully
            </DialogDescription>
          </DialogHeader>

          {finalResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{finalResult.successful.toLocaleString()}</p>
                  <p className="text-sm text-green-700">Successful</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <p className="text-3xl font-bold text-yellow-600">{formatTime(finalResult.duration)}</p>
                  <p className="text-sm text-yellow-700">Total Time</p>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Average speed: {Math.round(finalResult.processed / finalResult.duration).toLocaleString()} rows/second</p>
                {finalResult.failed > 0 && (
                  <p className="text-red-600 mt-1">{finalResult.failed.toLocaleString()} rows failed</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset} className="flex-1">
                  Import Another File
                </Button>
                <Button onClick={() => setShowCompleteDialog(false)} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
