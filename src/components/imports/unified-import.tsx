'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore, parseCSV, suggestColumnMapping, ImportType, ParsedCSV, ColumnMapping, ImportValidationError } from '@/lib/store'
import { FileUp, Download, AlertCircle, CheckCircle, X, ChevronRight, Table2, BarChart3, Package, Receipt, Upload } from 'lucide-react'

interface ImportStats {
  productsAdded: number
  productsUpdated: number
  salesAdded: number
  errors: ImportValidationError[]
}

export function UnifiedImport() {
  const [activeTab, setActiveTab] = useState('upload')
  const [csvContent, setCsvContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([])
  const [importType, setImportType] = useState<ImportType>('unified')
  const [previewData, setPreviewData] = useState<ImportStats | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const store = useStore()
  const analytics = store.getAnalytics()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files?.[0]) {
      handleFile(files[0])
    }
  }, [])

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
      setFileName(file.name)

      try {
        const parsed = parseCSV(content)
        setParsedCSV(parsed)

        // Auto-suggest column mapping
        const mapping = suggestColumnMapping(parsed.headers)
        setColumnMapping(mapping)

        setActiveTab('mapping')
      } catch (error) {
        alert('Error parsing CSV: ' + (error as Error).message)
      }
    }
    reader.readAsText(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
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

  const processImport = () => {
    if (!parsedCSV) return

    setIsProcessing(true)

    // Simulate processing delay
    setTimeout(() => {
      const result = store.importUnified(parsedCSV.rows, columnMapping)
      setPreviewData(result)
      setIsProcessing(false)
      setShowPreviewDialog(true)
    }, 500)
  }

  const downloadTemplate = () => {
    const headers = [
      'sku', 'name', 'description', 'category', 'barcode', 'selling_price', 'cost_price', 'tax_rate',
      'stock', 'min_stock_level', 'max_stock_level', 'reorder_point', 'reorder_quantity',
      'unit_of_measure', 'supplier_name', 'supplier_contact', 'is_active', 'receipt_number',
      'transaction_date', 'location_name', 'quantity', 'unit_price', 'discount_amount', 'tax_amount',
      'payment_method', 'customer_name', 'customer_email', 'customer_phone', 'cashier_name', 'notes'
    ]

    // Sample product row
    const productRow = [
      'PROD-001', 'Sample Product', 'A sample product description', 'Category A', '123456789012',
      '19.99', '12.00', '8.25', '100', '10', '500', '25', '50', 'each', 'Supplier Co',
      'contact@supplier.com', 'true', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]

    // Sample sales row
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
    setCsvContent('')
    setFileName('')
    setParsedCSV(null)
    setColumnMapping([])
    setPreviewData(null)
    setActiveTab('upload')
  }

  // Get unmapped CSV columns
  const unmappedColumns = parsedCSV?.headers.filter(
    (h) => !columnMapping.some((m) => m.csvColumn === h)
  ) || []

  // Get available database fields
  const availableFields = [
    { value: 'sku', label: 'SKU' },
    { value: 'name', label: 'Product Name' },
    { value: 'description', label: 'Description' },
    { value: 'category', label: 'Category' },
    { value: 'barcode', label: 'Barcode' },
    { value: 'sellingPrice', label: 'Selling Price' },
    { value: 'costPrice', label: 'Cost Price' },
    { value: 'taxRate', label: 'Tax Rate' },
    { value: 'stock', label: 'Stock' },
    { value: 'minStockLevel', label: 'Min Stock Level' },
    { value: 'maxStockLevel', label: 'Max Stock Level' },
    { value: 'reorderPoint', label: 'Reorder Point' },
    { value: 'reorderQuantity', label: 'Reorder Quantity' },
    { value: 'unitOfMeasure', label: 'Unit of Measure' },
    { value: 'supplierName', label: 'Supplier Name' },
    { value: 'supplierContact', label: 'Supplier Contact' },
    { value: 'isActive', label: 'Is Active' },
    { value: 'receiptNumber', label: 'Receipt Number' },
    { value: 'transactionDate', label: 'Transaction Date' },
    { value: 'locationName', label: 'Location Name' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'unitPrice', label: 'Unit Price' },
    { value: 'discountAmount', label: 'Discount Amount' },
    { value: 'taxAmount', label: 'Tax Amount' },
    { value: 'paymentMethod', label: 'Payment Method' },
    { value: 'customerName', label: 'Customer Name' },
    { value: 'customerEmail', label: 'Customer Email' },
    { value: 'customerPhone', label: 'Customer Phone' },
    { value: 'cashierName', label: 'Cashier Name' },
    { value: 'notes', label: 'Notes' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <h3 className="text-2xl font-bold">{analytics.totalProducts}</h3>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <h3 className="text-2xl font-bold">{analytics.totalSales}</h3>
              </div>
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <h3 className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</h3>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gross Margin</p>
                <h3 className="text-2xl font-bold">{analytics.grossMargin.toFixed(1)}%</h3>
              </div>
              <Table2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. Upload CSV</TabsTrigger>
          <TabsTrigger value="mapping" disabled={!parsedCSV}>2. Map Columns</TabsTrigger>
          <TabsTrigger value="preview" disabled={columnMapping.length === 0}>3. Preview & Import</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Unified CSV
              </CardTitle>
              <CardDescription>
                Upload your unified CSV file containing both product and sales data.
                <br />
                Rows without receipt_number are treated as products.
                Rows with receipt_number are treated as sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                  ${parsedCSV ? 'bg-green-50 border-green-300' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {parsedCSV ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-lg font-medium">{fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {parsedCSV.totalRows} rows detected
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('mapping')}>
                      Continue to Mapping
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Drag & drop your CSV file</p>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="csv-upload">Select File</label>
                    </Button>
                  </>
                )}
              </div>

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

        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Map CSV Columns</CardTitle>
              <CardDescription>
                Map your CSV columns to the corresponding fields.
                <br />
                Rows with a receipt_number will be treated as sales; rows without will be treated as products.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {parsedCSV && (
                <div className="space-y-4">
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium">
                      Detected {parsedCSV.totalRows} rows with {parsedCSV.headers.length} columns
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
                        {/* Mapped columns */}
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
                                  {availableFields.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMapping(mapping.csvColumn)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Unmapped columns */}
                        {unmappedColumns.map((col) => (
                          <TableRow key={col}>
                            <TableCell className="font-mono text-sm text-muted-foreground">{col}</TableCell>
                            <TableCell>
                              <Select onValueChange={(value) => handleMappingChange(col, value)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select field..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableFields.map((f) => (
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
                    <Button
                      onClick={() => setActiveTab('preview')}
                      disabled={columnMapping.length === 0}
                    >
                      Continue to Preview
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview & Import</CardTitle>
              <CardDescription>
                Review your mapping and import the data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActiveTab('mapping')}>
                  Back to Mapping
                </Button>
                <Button onClick={processImport} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Import Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Import Complete!
            </DialogTitle>
            <DialogDescription>
              Your data has been imported successfully.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{previewData.productsAdded}</p>
                  <p className="text-sm text-green-700">Products Added</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{previewData.productsUpdated}</p>
                  <p className="text-sm text-blue-700">Products Updated</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{previewData.salesAdded}</p>
                  <p className="text-sm text-purple-700">Sales Added</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${previewData.errors.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${previewData.errors.length > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {previewData.errors.length}
                  </p>
                  <p className={`text-sm ${previewData.errors.length > 0 ? 'text-red-700' : 'text-gray-700'}`}>Errors</p>
                </div>
              </div>

              {previewData.errors.length > 0 && (
                <div className="border rounded-md p-4 bg-red-50">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Errors ({previewData.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto text-sm">
                    {previewData.errors.slice(0, 10).map((error, i) => (
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

              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>
                  Import Another File
                </Button>
                <Button onClick={() => setShowPreviewDialog(false)}>
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
