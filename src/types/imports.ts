// Import Types and Constants
// These are used by both client and server code

// CSV Row Types
export type CSVRow = Record<string, string>

export interface ParsedCSV {
  headers: string[]
  rows: CSVRow[]
  totalRows: number
}

// Multi-file upload types
export interface QueuedFile {
  id: string
  file: File
  content: string
  name: string
  status: 'pending' | 'uploading' | 'mapping' | 'preview' | 'processing' | 'completed' | 'error'
  parsedCSV?: ParsedCSV
  columnMapping?: ColumnMapping[]
  previewResult?: ImportPreviewResult
  importId?: string
  error?: string
}

// Import Types
export type ImportType = 'products' | 'inventory' | 'sales' | 'unified'

export interface ColumnMapping {
  csvColumn: string
  dbField: string
  transform?: string
}

export interface ImportValidationError {
  rowNumber: number
  field: string
  value: string
  message: string
}

export interface ImportPreviewRow {
  rowNumber: number
  data: Record<string, unknown>
  errors: ImportValidationError[]
  warnings: ImportValidationError[]
}

export interface ImportPreviewResult {
  totalRows: number
  validRows: number
  invalidRows: number
  previewRows: ImportPreviewRow[]
  columnMapping: ColumnMapping[]
}

export interface ImportStatus {
  id: string
  storeId: string
  importType: ImportType
  fileName: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  totalRows: number
  processedRows: number
  successfulRows: number
  failedRows: number
  errorLog: ImportValidationError[]
  startedAt?: string
  completedAt?: string
  createdAt: string
  processingTimeMs?: number
  mappingAccuracy?: number
  columnMapping?: ColumnMapping[]
  columnMappingDetails?: {
    csvColumn: string
    dbField: string
    isMatched: boolean
    confidence: 'high' | 'medium' | 'low'
  }[]
}

// Field definitions for each import type
export const IMPORT_FIELDS: Record<ImportType, { name: string; required: boolean; type: string; description: string }[]> = {
  products: [
    { name: 'sku', required: true, type: 'string', description: 'Unique product SKU' },
    { name: 'name', required: true, type: 'string', description: 'Product name' },
    { name: 'description', required: false, type: 'string', description: 'Product description' },
    { name: 'category', required: false, type: 'string', description: 'Category name' },
    { name: 'barcode', required: false, type: 'string', description: 'Barcode/EAN' },
    { name: 'cost_price', required: false, type: 'number', description: 'Cost price' },
    { name: 'selling_price', required: true, type: 'number', description: 'Selling price' },
    { name: 'tax_rate', required: false, type: 'number', description: 'Tax rate (0-1)' },
    { name: 'min_stock_level', required: false, type: 'integer', description: 'Minimum stock level' },
    { name: 'max_stock_level', required: false, type: 'integer', description: 'Maximum stock level' },
    { name: 'reorder_point', required: false, type: 'integer', description: 'Reorder point' },
    { name: 'reorder_quantity', required: false, type: 'integer', description: 'Reorder quantity' },
    { name: 'supplier_name', required: false, type: 'string', description: 'Supplier name' },
    { name: 'supplier_contact', required: false, type: 'string', description: 'Supplier contact' },
    { name: 'unit_of_measure', required: false, type: 'string', description: 'Unit (unit, kg, liter, etc)' },
    { name: 'weight_kg', required: false, type: 'number', description: 'Weight in kg' },
    { name: 'is_active', required: false, type: 'boolean', description: 'Is active (true/false)' },
    { name: 'stock', required: false, type: 'integer', description: 'Initial stock quantity (creates inventory snapshot)' },
  ],
  inventory: [
    { name: 'sku', required: true, type: 'string', description: 'Product SKU' },
    { name: 'location_name', required: false, type: 'string', description: 'Store location name OR physical area (e.g., Main Floor, Cooler). Physical areas are stored for filtering.' },
    { name: 'quantity', required: true, type: 'integer', description: 'Current quantity' },
    { name: 'unit_cost', required: false, type: 'number', description: 'Unit cost' },
    { name: 'snapshot_date', required: false, type: 'date', description: 'Snapshot date (YYYY-MM-DD)' },
    { name: 'notes', required: false, type: 'string', description: 'Notes' },
  ],
  sales: [
    { name: 'receipt_number', required: true, type: 'string', description: 'Receipt number' },
    { name: 'transaction_date', required: true, type: 'datetime', description: 'Transaction date (YYYY-MM-DD HH:MM:SS)' },
    { name: 'location_name', required: false, type: 'string', description: 'Store location name OR physical area (e.g., Main Floor, Cooler). Physical areas are stored for filtering.' },
    { name: 'sku', required: false, type: 'string', description: 'Product SKU' },
    { name: 'product_name', required: false, type: 'string', description: 'Product name (if no SKU)' },
    { name: 'quantity', required: true, type: 'integer', description: 'Quantity sold' },
    { name: 'unit_price', required: true, type: 'number', description: 'Unit price' },
    { name: 'discount_amount', required: false, type: 'number', description: 'Discount amount' },
    { name: 'tax_amount', required: false, type: 'number', description: 'Tax amount' },
    { name: 'payment_method', required: false, type: 'string', description: 'Payment method (cash/card/digital_wallet/other)' },
    { name: 'customer_name', required: false, type: 'string', description: 'Customer name' },
    { name: 'customer_email', required: false, type: 'string', description: 'Customer email' },
    { name: 'customer_phone', required: false, type: 'string', description: 'Customer phone' },
    { name: 'cashier_name', required: false, type: 'string', description: 'Cashier name' },
    { name: 'notes', required: false, type: 'string', description: 'Notes' },
  ],
  unified: [
    // Product fields
    { name: 'sku', required: false, type: 'string', description: 'Product SKU (required for products/sales)' },
    { name: 'name', required: false, type: 'string', description: 'Product name (required for new products)' },
    { name: 'description', required: false, type: 'string', description: 'Product description' },
    { name: 'category', required: false, type: 'string', description: 'Category name' },
    { name: 'barcode', required: false, type: 'string', description: 'Barcode/EAN' },
    { name: 'selling_price', required: false, type: 'number', description: 'Selling price (required for new products)' },
    { name: 'cost_price', required: false, type: 'number', description: 'Cost price' },
    { name: 'tax_rate', required: false, type: 'number', description: 'Tax rate (0-1)' },
    { name: 'stock', required: false, type: 'integer', description: 'Stock quantity (creates inventory snapshot for products)' },
    { name: 'min_stock_level', required: false, type: 'integer', description: 'Minimum stock level' },
    { name: 'max_stock_level', required: false, type: 'integer', description: 'Maximum stock level' },
    { name: 'reorder_point', required: false, type: 'integer', description: 'Reorder point' },
    { name: 'reorder_quantity', required: false, type: 'integer', description: 'Reorder quantity' },
    { name: 'unit_of_measure', required: false, type: 'string', description: 'Unit (unit, kg, liter, etc)' },
    { name: 'supplier_name', required: false, type: 'string', description: 'Supplier name' },
    { name: 'supplier_contact', required: false, type: 'string', description: 'Supplier contact' },
    { name: 'is_active', required: false, type: 'boolean', description: 'Is active (true/false)' },
    { name: 'weight_kg', required: false, type: 'number', description: 'Weight in kg' },
    // Sales fields
    { name: 'receipt_number', required: false, type: 'string', description: 'Receipt number (if present, treated as sales data)' },
    { name: 'transaction_date', required: false, type: 'datetime', description: 'Transaction date (YYYY-MM-DD HH:MM:SS)' },
    { name: 'location_name', required: false, type: 'string', description: 'Store location or physical area' },
    { name: 'product_name', required: false, type: 'string', description: 'Product name for sales (if no SKU)' },
    { name: 'quantity', required: false, type: 'integer', description: 'Quantity (for sales, uses this if receipt_number present)' },
    { name: 'unit_price', required: false, type: 'number', description: 'Unit price (for sales)' },
    { name: 'discount_amount', required: false, type: 'number', description: 'Discount amount (for sales)' },
    { name: 'tax_amount', required: false, type: 'number', description: 'Tax amount (for sales)' },
    { name: 'payment_method', required: false, type: 'string', description: 'Payment method (cash/card/digital_wallet/other)' },
    { name: 'customer_name', required: false, type: 'string', description: 'Customer name' },
    { name: 'customer_email', required: false, type: 'string', description: 'Customer email' },
    { name: 'customer_phone', required: false, type: 'string', description: 'Customer phone' },
    { name: 'cashier_name', required: false, type: 'string', description: 'Cashier name' },
    { name: 'snapshot_date', required: false, type: 'date', description: 'Snapshot date for inventory (YYYY-MM-DD)' },
    { name: 'notes', required: false, type: 'string', description: 'Notes' },
  ],
}

// Common field synonyms for auto-mapping
export const FIELD_SYNONYMS: Record<string, string[]> = {
  sku: ['sku', 'product_code', 'item_code', 'code', 'product_id', 'item_number', 'upc', 'ean'],
  name: ['name', 'product_name', 'item_name', 'title', 'description', 'product_title'],
  description: ['description', 'product_description', 'details', 'long_description'],
  category: ['category', 'category_name', 'product_category', 'department', 'class'],
  barcode: ['barcode', 'upc', 'ean', 'scan_code', 'bar_code', 'ean13', 'gtin'],
  cost_price: ['cost_price', 'cost', 'unit_cost', 'purchase_price', 'buy_price', 'wholesale_price'],
  selling_price: ['selling_price', 'price', 'retail_price', 'unit_price', 'sale_price', 'list_price', 'amount'],
  tax_rate: ['tax_rate', 'tax', 'vat_rate', 'gst_rate', 'tax_percentage', 'vat'],
  min_stock_level: ['min_stock_level', 'min_stock', 'minimum_stock', 'safety_stock', 'min_level'],
  max_stock_level: ['max_stock_level', 'max_stock', 'maximum_stock', 'max_level'],
  reorder_point: ['reorder_point', 'reorder_level', 'reorder_at', 'replenishment_point'],
  reorder_quantity: ['reorder_quantity', 'reorder_qty', 'replenishment_qty', 'order_quantity'],
  supplier_name: ['supplier_name', 'supplier', 'vendor_name', 'vendor', 'distributor', 'manufacturer'],
  supplier_contact: ['supplier_contact', 'vendor_contact', 'supplier_email', 'supplier_phone'],
  unit_of_measure: ['unit_of_measure', 'uom', 'unit', 'measure', 'measurement', 'packaging'],
  weight_kg: ['weight_kg', 'weight', 'product_weight', 'net_weight', 'gross_weight'],
  is_active: ['is_active', 'active', 'status', 'enabled', 'visible'],
  quantity: ['quantity', 'qty', 'amount', 'count', 'units', 'stock_quantity'],
  stock: ['stock', 'stock_level', 'current_stock', 'inventory', 'on_hand', 'onhand', 'in_stock'],
  location_name: ['location_name', 'location', 'store_location', 'branch', 'warehouse'],
  receipt_number: ['receipt_number', 'receipt_no', 'receipt_id', 'transaction_id', 'order_number', 'invoice_number', 'sale_id'],
  transaction_date: ['transaction_date', 'date', 'sale_date', 'order_date', 'datetime', 'timestamp', 'created_at'],
  discount_amount: ['discount_amount', 'discount', 'discount_value', 'markdown'],
  tax_amount: ['tax_amount', 'tax', 'sales_tax', 'vat_amount'],
  payment_method: ['payment_method', 'payment_type', 'payment', 'tender'],
  customer_name: ['customer_name', 'customer', 'buyer_name', 'client_name'],
  customer_email: ['customer_email', 'email', 'buyer_email'],
  customer_phone: ['customer_phone', 'phone', 'telephone', 'mobile'],
  cashier_name: ['cashier_name', 'cashier', 'employee_name', 'staff_name', 'seller'],
  notes: ['notes', 'comments', 'remarks', 'note'],
  snapshot_date: ['snapshot_date', 'inventory_date', 'count_date', 'as_of_date'],
}
