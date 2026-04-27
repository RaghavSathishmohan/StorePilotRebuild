'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { parseCSV, createImport, processImport } from '@/app/actions/imports'
import { CheckCircle, AlertCircle, Upload, FileText, Loader2, Package, Receipt } from 'lucide-react'

interface AutoImportProps {
  storeId: string
  onImportComplete?: () => void
}

interface FileState {
  file: File | null
  content: string
  parsed: { headers: string[]; rows: Record<string, string>[]; totalRows: number } | null
  type: 'products' | 'sales' | null
  status: 'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'
  error?: string
}

// Auto-mapping configuration - maps common CSV headers to DB fields
const AUTO_MAPPINGS: Record<string, Record<string, string>> = {
  products: {
    'sku': 'sku',
    'product_code': 'sku',
    'item_code': 'sku',
    'code': 'sku',
    'name': 'name',
    'product_name': 'name',
    'item_name': 'name',
    'title': 'name',
    'category': 'category',
    'category_name': 'category',
    'product_category': 'category',
    'department': 'category',
    'barcode': 'barcode',
    'upc': 'barcode',
    'ean': 'barcode',
    'scan_code': 'barcode',
    'cost_price': 'cost_price',
    'cost': 'cost_price',
    'unit_cost': 'cost_price',
    'purchase_price': 'cost_price',
    'buy_price': 'cost_price',
    'selling_price': 'selling_price',
    'price': 'selling_price',
    'retail_price': 'selling_price',
    'sale_price': 'selling_price',
    'tax_rate': 'tax_rate',
    'tax': 'tax_rate',
    'vat_rate': 'tax_rate',
    'stock': 'stock',
    'stock_level': 'stock',
    'current_stock': 'stock',
    'inventory': 'stock',
    'on_hand': 'stock',
    'onhand': 'stock',
    'min_stock': 'min_stock_level',
    'min_stock_level': 'min_stock_level',
    'minimum_stock': 'min_stock_level',
    'safety_stock': 'min_stock_level',
    'max_stock': 'max_stock_level',
    'max_stock_level': 'max_stock_level',
    'maximum_stock': 'max_stock_level',
    'reorder_point': 'reorder_point',
    'reorder_level': 'reorder_point',
    'replenishment_point': 'reorder_point',
    'reorder_quantity': 'reorder_quantity',
    'order_quantity': 'reorder_quantity',
    'unit_of_measure': 'unit_of_measure',
    'uom': 'unit_of_measure',
    'unit': 'unit_of_measure',
    'supplier_name': 'supplier_name',
    'supplier': 'supplier_name',
    'vendor': 'supplier_name',
    'supplier_contact': 'supplier_contact',
    'vendor_contact': 'supplier_contact',
    'is_active': 'is_active',
    'active': 'is_active',
    'status': 'is_active',
  },
  sales: {
    'receipt_number': 'receipt_number',
    'receipt_no': 'receipt_number',
    'transaction_id': 'receipt_number',
    'order_number': 'receipt_number',
    'invoice_number': 'receipt_number',
    'transaction_date': 'transaction_date',
    'date': 'transaction_date',
    'sale_date': 'transaction_date',
    'datetime': 'transaction_date',
    'sku': 'sku',
    'product_sku': 'sku',
    'product_code': 'sku',
    'product_name': 'product_name',
    'name': 'product_name',
    'quantity': 'quantity',
    'qty': 'quantity',
    'amount': 'quantity',
    'count': 'quantity',
    'unit_price': 'unit_price',
    'price': 'unit_price',
    'sale_price': 'unit_price',
    'discount_amount': 'discount_amount',
    'discount': 'discount_amount',
    'tax_amount': 'tax_amount',
    'sales_tax': 'tax_amount',
    'tax': 'tax_amount',
    'payment_method': 'payment_method',
    'payment_type': 'payment_method',
    'payment': 'payment_method',
    'total_amount': 'total_amount',
    'total': 'total_amount',
  }
}

// Detect file type based on headers
function detectFileType(headers: string[]): 'products' | 'sales' {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  // Check for sales-specific columns
  const salesColumns = ['receipt_number', 'transaction_date', 'quantity', 'payment_method']
  const salesScore = salesColumns.filter(col => normalizedHeaders.includes(col)).length

  // Check for product-specific columns
  const productColumns = ['stock', 'cost_price', 'selling_price', 'category']
  const productScore = productColumns.filter(col => normalizedHeaders.includes(col)).length

  return salesScore > productScore ? 'sales' : 'products'
}

// Auto-generate column mapping
function autoGenerateMapping(headers: string[], type: 'products' | 'sales') {
  const mapping: { csvColumn: string; dbField: string }[] = []
  const mappings = AUTO_MAPPINGS[type]

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '_')

    // Try exact match first
    if (mappings[normalized]) {
      mapping.push({ csvColumn: header, dbField: mappings[normalized] })
      return
    }

    // Try without underscores/spaces
    const noUnderscores = normalized.replace(/_/g, '')
    for (const [key, value] of Object.entries(mappings)) {
      if (key.replace(/_/g, '') === noUnderscores) {
        mapping.push({ csvColumn: header, dbField: value })
        return
      }
    }
  })

  return mapping
}

export function AutoImport({ storeId, onImportComplete }: AutoImportProps) {
  const [productsFile, setProductsFile] = useState<FileState>({
    file: null,
    content: '',
    parsed: null,
    type: null,
    status: 'idle'
  })

  const [salesFile, setSalesFile] = useState<FileState>({
    file: null,
    content: '',
    parsed: null,
    type: null,
    status: 'idle'
  })

  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFileDrop = useCallback(async (e: React.DragEvent, type: 'products' | 'sales') => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      await processFile(files[0], type)
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'products' | 'sales') => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFile(files[0], type)
    }
  }, [])

  const processFile = async (file: File, expectedType: 'products' | 'sales') => {
    const setFile = expectedType === 'products' ? setProductsFile : setSalesFile

    setFile(prev => ({ ...prev, status: 'parsing' }))

    try {
      const content = await file.text()
      const parsed = await parseCSV(content)

      // Auto-detect file type from headers
      const detectedType = detectFileType(parsed.headers)

      // Auto-generate column mapping
      const mapping = autoGenerateMapping(parsed.headers, detectedType)

      setFile({
        file,
        content,
        parsed,
        type: detectedType,
        status: 'ready',
        error: detectedType !== expectedType
          ? `Warning: File appears to be ${detectedType} data, but you dropped it in ${expectedType}. This is fine if intentional.`
          : undefined
      })
    } catch (error) {
      setFile({
        file: null,
        content: '',
        parsed: null,
        type: null,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to parse file'
      })
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    setImportProgress(0)

    try {
      // Import products first
      if (productsFile.status === 'ready' && productsFile.parsed) {
        setImportProgress(10)
        const mapping = autoGenerateMapping(productsFile.parsed.headers, 'products')

        // Create import record
        const { id: importId } = await createImport(
          storeId,
          'products',
          productsFile.file?.name || 'products.csv',
          '',
          mapping
        )

        // Process import
        await processImport(importId, productsFile.parsed, 'products', mapping, storeId)
        setImportProgress(50)
      }

      // Then import sales
      if (salesFile.status === 'ready' && salesFile.parsed) {
        setImportProgress(60)
        const mapping = autoGenerateMapping(salesFile.parsed.headers, 'sales')

        // Create import record
        const { id: importId } = await createImport(
          storeId,
          'sales',
          salesFile.file?.name || 'sales.csv',
          '',
          mapping
        )

        // Process import
        await processImport(importId, salesFile.parsed, 'sales', mapping, storeId)
        setImportProgress(100)
      }

      setResult({
        success: true,
        productsImported: productsFile.parsed?.totalRows || 0,
        salesImported: salesFile.parsed?.totalRows || 0
      })

      onImportComplete?.()
    } catch (error) {
      console.error('Import error:', error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      })
    } finally {
      setIsImporting(false)
      setShowResult(true)
    }
  }

  const clearFile = (type: 'products' | 'sales') => {
    if (type === 'products') {
      setProductsFile({ file: null, content: '', parsed: null, type: null, status: 'idle' })
    } else {
      setSalesFile({ file: null, content: '', parsed: null, type: null, status: 'idle' })
    }
  }

  const reset = () => {
    setProductsFile({ file: null, content: '', parsed: null, type: null, status: 'idle' })
    setSalesFile({ file: null, content: '', parsed: null, type: null, status: 'idle' })
    setImportProgress(0)
    setResult(null)
    setShowResult(false)
  }

  const bothFilesReady = productsFile.status === 'ready' && salesFile.status === 'ready'
  const atLeastOneReady = productsFile.status === 'ready' || salesFile.status === 'ready'

  const FileDropZone = ({
    type,
    state,
    icon: Icon
  }: {
    type: 'products' | 'sales',
    state: FileState,
    icon: any
  }) => (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        state.status === 'ready'
          ? 'border-green-500 bg-green-50'
          : state.status === 'error'
          ? 'border-red-500 bg-red-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleFileDrop(e, type)}
    >
      {state.status === 'parsing' ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Parsing file...</p>
        </div>
      ) : state.status === 'ready' && state.parsed ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-medium">{state.file?.name}</p>
          <p className="text-sm text-muted-foreground">
            {state.parsed.totalRows.toLocaleString()} rows • {state.parsed.headers.length} columns
          </p>
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {autoGenerateMapping(state.parsed.headers, type).slice(0, 5).map((m, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {m.csvColumn} → {m.dbField}
              </Badge>
            ))}
            {autoGenerateMapping(state.parsed.headers, type).length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{autoGenerateMapping(state.parsed.headers, type).length - 5} more
              </Badge>
            )}
          </div>
          {state.error && (
            <p className="text-xs text-amber-600 mt-2">{state.error}</p>
          )}
          <Button variant="ghost" size="sm" onClick={() => clearFile(type)} className="mt-2">
            Remove
          </Button>
        </div>
      ) : state.status === 'error' ? (
        <div className="space-y-2">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{state.error}</p>
          <Button variant="outline" size="sm" onClick={() => clearFile(type)}>
            Try Again
          </Button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Drop {type} CSV here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Headers auto-mapped • No manual configuration needed
            </p>
          </div>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e, type)}
          />
        </label>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auto Import</CardTitle>
          <CardDescription>
            Drop your products and sales CSV files. Columns are automatically detected and mapped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products File
                {productsFile.status === 'ready' && (
                  <Badge variant="default" className="ml-auto">Ready</Badge>
                )}
              </h4>
              <FileDropZone type="products" state={productsFile} icon={FileText} />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Sales File
                {salesFile.status === 'ready' && (
                  <Badge variant="default" className="ml-auto">Ready</Badge>
                )}
              </h4>
              <FileDropZone type="sales" state={salesFile} icon={FileText} />
            </div>
          </div>

          {atLeastOneReady && (
            <>
              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Ready to Import</h4>
                    <p className="text-sm text-muted-foreground">
                      {productsFile.status === 'ready' && `${productsFile.parsed?.totalRows.toLocaleString()} products`}
                      {productsFile.status === 'ready' && salesFile.status === 'ready' && ' • '}
                      {salesFile.status === 'ready' && `${salesFile.parsed?.totalRows.toLocaleString()} sales records`}
                    </p>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting}
                    size="lg"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>Import All Data</>
                    )}
                  </Button>
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-sm text-muted-foreground text-center">
                      {importProgress < 50 ? 'Importing products...' :
                       importProgress < 100 ? 'Importing sales...' :
                       'Finalizing...'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={result?.success ? 'text-green-600' : 'text-red-600'}>
              {result?.success ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  Import Complete
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6" />
                  Import Failed
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {result?.success
                ? `Successfully imported ${result.productsImported} products and ${result.salesImported} sales records.`
                : result?.error}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset} className="flex-1">
              Import More Files
            </Button>
            <Button onClick={() => setShowResult(false)} className="flex-1">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
