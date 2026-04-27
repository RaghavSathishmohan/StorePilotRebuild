'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { FileUpload } from './file-upload'
import { parseCSV, suggestColumnMapping, previewImport, createImport, processImport } from '@/app/actions/imports'
import { processImportChunk, createChunkedImport, finalizeChunkedImport } from '@/app/actions/import-chunked'
import { CheckCircle, AlertCircle, X, ChevronRight, Download, Loader2, Zap } from 'lucide-react'

const AVAILABLE_FIELDS = [
  { value: 'sku', label: 'SKU' },
  { value: 'name', label: 'Product Name' },
  { value: 'description', label: 'Description' },
  { value: 'category', label: 'Category' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'selling_price', label: 'Selling Price' },
  { value: 'cost_price', label: 'Cost Price' },
  { value: 'tax_rate', label: 'Tax Rate' },
  { value: 'stock', label: 'Stock' },
  { value: 'min_stock_level', label: 'Min Stock Level' },
  { value: 'max_stock_level', label: 'Max Stock Level' },
  { value: 'reorder_point', label: 'Reorder Point' },
  { value: 'reorder_quantity', label: 'Reorder Quantity' },
  { value: 'unit_of_measure', label: 'Unit of Measure' },
  { value: 'supplier_name', label: 'Supplier Name' },
  { value: 'supplier_contact', label: 'Supplier Contact' },
  { value: 'is_active', label: 'Is Active' },
  { value: 'receipt_number', label: 'Receipt Number' },
  { value: 'transaction_date', label: 'Transaction Date' },
  { value: 'location_name', label: 'Location Name' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'discount_amount', label: 'Discount Amount' },
  { value: 'tax_amount', label: 'Tax Amount' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: 'customer_name', label: 'Customer Name' },
  { value: 'customer_email', label: 'Customer Email' },
  { value: 'customer_phone', label: 'Customer Phone' },
  { value: 'cashier_name', label: 'Cashier Name' },
  { value: 'notes', label: 'Notes' },
]

interface FastUnifiedImportProps {
  storeId: string
}

const CHUNK_SIZE = 5000 // Process 5000 rows at a time

export function FastUnifiedImport({ storeId }: FastUnifiedImportProps) {
  const [activeTab, setActiveTab] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [parsedCSV, setParsedCSV] = useState<{ headers: string[]; rows: Record<string, string>[]; totalRows: number } | null>(null)
  const [columnMapping, setColumnMapping] = useState<{ csvColumn: string; dbField: string; confidence?: string }[]>([])
  const [previewData, setPreviewData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' })

  const abortRef = useRef(false)

  const handleFileSelect = async (file: File, content: string) => {
    setFileName(file.name)
    try {
      const parsed = await parseCSV(content)
      setParsedCSV(parsed)

      // Auto-suggest column mapping
      const mapping = await suggestColumnMapping(parsed.headers, 'unified')
      setColumnMapping(mapping)

      setActiveTab('mapping')
    } catch (error) {
      alert('Error parsing CSV: ' + (error as Error).message)
    }
  }

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    setColumnMapping((prev) => {
      const existing = prev.find((m) => m.csvColumn === csvColumn)
      if (existing) {
        return prev.map((m) => (m.csvColumn === csvColumn ? { ...m, dbField } : m))
      }
      return [...prev, { csvColumn, dbField }]
    })
  }

  const removeMapping = (csvColumn: string) => {
    setColumnMapping((prev) => prev.filter((m) => m.csvColumn !== csvColumn))
  }

  const handlePreview = async () => {
    if (!parsedCSV) return

    setIsProcessing(true)
    try {
      const result = await previewImport(parsedCSV, 'unified', columnMapping, storeId)
      setPreviewData(result)
      setActiveTab('preview')
    } catch (error) {
      alert('Error previewing import: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const transformValue = (value: string, field: string): unknown => {
    const trimmed = value.trim()
    if (!trimmed) return null

    const numberFields = ['cost_price', 'selling_price', 'tax_rate', 'stock', 'min_stock_level', 'max_stock_level', 'quantity', 'unit_price', 'discount_amount', 'tax_amount']
    if (numberFields.includes(field)) {
      const num = parseFloat(trimmed.replace(/[$,]/g, ''))
      return isNaN(num) ? null : num
    }

    if (field === 'is_active') {
      const lower = trimmed.toLowerCase()
      return ['true', '1', 'yes', 'y'].includes(lower)
    }

    if (field === 'transaction_date') {
      const date = new Date(trimmed)
      return isNaN(date.getTime()) ? null : date.toISOString()
    }

    return trimmed
  }

  const processInChunks = async (importId: string, rows: Record<string, string>[]) => {
    const fieldMap = new Map(columnMapping.map(m => [m.csvColumn, m.dbField]))
    const totalRows = rows.length
    let processedCount = 0
    let successfulCount = 0
    let failedCount = 0
    const errorLog: any[] = []

    // Group data by type
    const receiptsMap = new Map<string, any>()
    const productsToInsert: any[] = []
    const productsToUpdate: { id: string; sku: string; data: any }[] = []
    const categoriesToCreate = new Set<string>()
    const inventorySnapshots: any[] = []

    // Process rows in chunks
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      if (abortRef.current) break

      const chunk = rows.slice(i, Math.min(i + CHUNK_SIZE, rows.length))
      setProgress({ current: i, total: totalRows, stage: `Processing rows ${i + 1} to ${Math.min(i + CHUNK_SIZE, totalRows)}...` })

      // Clear previous chunk data
      receiptsMap.clear()
      productsToInsert.length = 0
      productsToUpdate.length = 0
      categoriesToCreate.clear()
      inventorySnapshots.length = 0

      // Process each row in the chunk
      for (const row of chunk) {
        const data: Record<string, unknown> = {}
        for (const [csvColumn, value] of Object.entries(row)) {
          const dbField = fieldMap.get(csvColumn)
          if (dbField) {
            data[dbField] = transformValue(value, dbField)
          }
        }

        const isSalesRow = data.receipt_number && String(data.receipt_number).trim() !== ''

        if (isSalesRow) {
          // Sales row processing
          const receiptNum = String(data.receipt_number)
          if (!receiptNum) continue

          if (!receiptsMap.has(receiptNum)) {
            receiptsMap.set(receiptNum, {
              receipt_number: receiptNum,
              transaction_date: String(data.transaction_date || new Date().toISOString()),
              payment_method: String(data.payment_method || 'other'),
              items: []
            })
          }

          const receipt = receiptsMap.get(receiptNum)!
          receipt.items.push({
            product_sku: String(data.sku || ''),
            product_name: String(data.name || 'Unknown'),
            quantity: Number(data.quantity || 1),
            unit_price: Number(data.unit_price || data.selling_price || 0),
            discount_amount: Number(data.discount_amount || 0),
            tax_amount: Number(data.tax_amount || 0),
            cost_price: Number(data.cost_price || 0),
            total_amount: (Number(data.unit_price || data.selling_price || 0) * Number(data.quantity || 1)) - Number(data.discount_amount || 0)
          })
        } else {
          // Product row processing
          if (!data.sku) continue

          const sku = String(data.sku)
          const productData = {
            store_id: storeId,
            sku: sku,
            name: String(data.name || ''),
            description: data.description || null,
            category_name: data.category || null,
            barcode: data.barcode || null,
            cost_price: data.cost_price || null,
            selling_price: data.selling_price || 0,
            tax_rate: data.tax_rate || 0,
            min_stock_level: data.min_stock_level || 0,
            max_stock_level: data.max_stock_level || null,
            reorder_point: data.reorder_point || 0,
            reorder_quantity: data.reorder_quantity || null,
            unit_of_measure: data.unit_of_measure || 'unit',
            supplier_name: data.supplier_name || null,
            supplier_contact: data.supplier_contact || null,
            is_active: data.is_active !== false,
            stock: data.stock || 0,
          }

          if (data.category) {
            categoriesToCreate.add(String(data.category))
          }

          productsToInsert.push(productData)

          if (data.stock && Number(data.stock) > 0) {
            inventorySnapshots.push({
              sku: sku,
              quantity: Number(data.stock),
              snapshot_date: new Date().toISOString().split('T')[0],
              notes: 'Imported from CSV',
            })
          }
        }
      }

      // Send chunk to server
      setProgress({ current: i, total: totalRows, stage: `Saving batch ${Math.floor(i / CHUNK_SIZE) + 1}...` })

      try {
        const result = await processImportChunk(
          storeId,
          importId,
          {
            receipts: Array.from(receiptsMap.values()),
            lineItems: [],
            products: { insert: productsToInsert, update: productsToUpdate },
            categories: Array.from(categoriesToCreate),
            inventorySnapshots: inventorySnapshots,
          },
          { isFirstChunk: i === 0, isLastChunk: i + CHUNK_SIZE >= totalRows }
        )

        if (result.success) {
          successfulCount += chunk.length
        } else {
          failedCount += chunk.length
          errorLog.push({ rowNumber: i, message: result.error })
        }
      } catch (err) {
        failedCount += chunk.length
        errorLog.push({ rowNumber: i, message: (err as Error).message })
      }

      processedCount += chunk.length
    }

    return {
      processed: processedCount,
      successful: successfulCount,
      failed: failedCount,
      errorLog,
    }
  }

  const handleImport = async () => {
    if (!parsedCSV) return

    setIsProcessing(true)
    abortRef.current = false

    try {
      // Create import record
      const { id: importId } = await createChunkedImport(
        storeId,
        'unified',
        fileName,
        JSON.stringify(parsedCSV.rows).length,
        parsedCSV.totalRows,
        columnMapping
      )

      // Process in chunks
      const results = await processInChunks(importId, parsedCSV.rows)

      // Finalize
      await finalizeChunkedImport(importId, results)

      setImportResult({
        success: true,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
      })
      setShowResultDialog(true)
    } catch (error) {
      alert('Error processing import: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
      setProgress({ current: 0, total: 0, stage: '' })
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'sku', 'name', 'description', 'category', 'barcode', 'selling_price', 'cost_price', 'tax_rate',
      'stock', 'min_stock_level', 'max_stock_level', 'reorder_point', 'reorder_quantity',
      'unit_of_measure', 'supplier_name', 'supplier_contact', 'is_active', 'receipt_number',
      'transaction_date', 'location_name', 'quantity', 'unit_price', 'discount_amount', 'tax_amount',
      'payment_method', 'customer_name', 'customer_email', 'customer_phone', 'cashier_name', 'notes'
    ]

    const productRow = [
      'PROD-001', 'Sample Product', 'A sample product', 'Category A', '123456789012',
      '19.99', '12.00', '8.25', '100', '10', '500', '25', '50', 'each', 'Supplier Co',
      'contact@supplier.com', 'true', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]

    const salesRow = [
      'PROD-001', 'Sample Product', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      'true', 'RCP-20250325-001', '2025-03-25 14:30:00', 'Main Floor', '2', '19.99', '0.00',
      '3.30', 'card', 'John Doe', 'john@example.com', '555-0123', 'Jane Cashier', ''
    ]

    const csv = [headers.join(','), productRow.join(','), salesRow.join(',')].join('\n')
    downloadCSV(csv, 'unified-import-template.csv')
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setFileName('')
    setParsedCSV(null)
    setColumnMapping([])
    setPreviewData(null)
    setImportResult(null)
    setProgress({ current: 0, total: 0, stage: '' })
    setActiveTab('upload')
    abortRef.current = false
  }

  // Get unmapped columns
  const unmappedColumns = parsedCSV?.headers.filter(
    (h) => !columnMapping.some((m) => m.csvColumn === h)
  ) || []

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. Upload CSV</TabsTrigger>
          <TabsTrigger value="mapping" disabled={!parsedCSV}>2. Map Columns</TabsTrigger>
          <TabsTrigger value="preview" disabled={!previewData}>3. Preview & Import</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle>Fast Unified Import</CardTitle>
              </div>
              <CardDescription>
                Optimized for large files. Upload your CSV with product and sales data.
                Rows without receipt_number are products; rows with receipt_number are sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload onFileSelect={handleFileSelect} maxSize={100} />

              <div className="flex items-center justify-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Get the unified CSV template with all required columns
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Map CSV Columns</CardTitle>
              <CardDescription>
                Map your CSV columns to the corresponding fields.
                Rows with receipt_number = sales; rows without = products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {parsedCSV && (
                <>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium">
                      Detected {parsedCSV.totalRows.toLocaleString()} rows with {parsedCSV.headers.length} columns
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-mapped {columnMapping.length} columns
                    </p>
                  </div>

                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CSV Column</TableHead>
                          <TableHead>Maps To</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columnMapping.map((mapping) => (
                          <TableRow key={mapping.csvColumn}>
                            <TableCell className="font-mono text-sm">{mapping.csvColumn}</TableCell>
                            <TableCell>
                              <Select
                                value={mapping.dbField}
                                onValueChange={(value) => handleMappingChange(mapping.csvColumn, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AVAILABLE_FIELDS.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => removeMapping(mapping.csvColumn)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {unmappedColumns.map((col) => (
                          <TableRow key={col}>
                            <TableCell className="font-mono text-sm text-muted-foreground">{col}</TableCell>
                            <TableCell>
                              <Select onValueChange={(value) => handleMappingChange(col, value)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select field..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {AVAILABLE_FIELDS.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('upload')}>
                      Back
                    </Button>
                    <Button onClick={handlePreview} disabled={isProcessing || columnMapping.length === 0}>
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Preview Import
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview & Import</CardTitle>
              <CardDescription>Review validation results before importing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {previewData && (
                <>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                    Validated all {previewData.totalRows.toLocaleString()} rows.
                    {parsedCSV && parsedCSV.totalRows > CHUNK_SIZE && (
                      <span className="ml-1 text-yellow-600">
                        Large file detected - will be processed in chunks of {CHUNK_SIZE.toLocaleString()} rows.
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{previewData.validRows.toLocaleString()}</p>
                      <p className="text-xs text-green-700">Valid</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{previewData.invalidRows.toLocaleString()}</p>
                      <p className="text-xs text-red-700">Invalid</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold">{previewData.totalRows.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Rows</p>
                    </div>
                  </div>

                  {previewData.errors.length > 0 && (
                    <div className="border rounded-md p-4 bg-red-50">
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Errors ({previewData.errors.length})
                      </h4>
                      <div className="max-h-40 overflow-y-auto text-sm">
                        {previewData.errors.slice(0, 10).map((error: any, i: number) => (
                          <p key={i} className="text-red-700">
                            Row {error.rowNumber}: {error.message}
                          </p>
                        ))}
                        {previewData.errors.length > 10 && (
                          <p className="text-red-600">...and {previewData.errors.length - 10} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {isProcessing && progress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{progress.stage}</span>
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                      </div>
                      <Progress value={(progress.current / progress.total) * 100} className="w-full" />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('mapping')} disabled={isProcessing}>
                      Back to Mapping
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={isProcessing || previewData.validRows === 0}
                    >
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Import {previewData.validRows.toLocaleString()} Rows
                      {parsedCSV && parsedCSV.totalRows > CHUNK_SIZE && <Zap className="ml-2 h-4 w-4" />}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult?.success ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Import Complete!
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  Import Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {importResult?.success
                ? 'Your data has been imported successfully.'
                : importResult?.error || 'An error occurred during import.'}
            </DialogDescription>
          </DialogHeader>

          {importResult?.success && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-green-600">{importResult.successful.toLocaleString()}</p>
                <p className="text-xs text-green-700">Successful</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xl font-bold text-red-600">{importResult.failed.toLocaleString()}</p>
                <p className="text-xs text-red-700">Failed</p>
              </div>
              <div className="bg-muted p-3 rounded-lg text-center">
                <p className="text-xl font-bold">{importResult.processed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Processed</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              Import Another File
            </Button>
            <Button onClick={() => setShowResultDialog(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
