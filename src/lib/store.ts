// Store for products, sales, and analytics
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Product type
export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category?: string
  barcode?: string
  costPrice?: number
  sellingPrice: number
  taxRate?: number
  stock?: number
  minStockLevel?: number
  maxStockLevel?: number
  reorderPoint?: number
  reorderQuantity?: number
  unitOfMeasure?: string
  supplierName?: string
  supplierContact?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Sale line item
export interface SaleLineItem {
  id: string
  productId?: string
  productName: string
  productSku?: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  costPrice?: number
}

// Sale/Receipt type
export interface Sale {
  id: string
  receiptNumber: string
  transactionDate: string
  locationName?: string
  lineItems: SaleLineItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paymentMethod: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  cashierName?: string
  notes?: string
  createdAt: string
}

// Inventory snapshot
export interface InventorySnapshot {
  id: string
  productId: string
  quantity: number
  snapshotDate: string
  notes?: string
}

// Analytics computed from data
export interface Analytics {
  // Sales metrics
  totalRevenue: number
  totalSales: number
  totalItemsSold: number
  averageOrderValue: number
  averageItemsPerTransaction: number

  // Product metrics
  totalProducts: number
  activeProducts: number
  lowStockProducts: number
  outOfStockProducts: number

  // Profit metrics
  totalCost: number
  grossProfit: number
  grossMargin: number

  // Category breakdown
  salesByCategory: Record<string, number>
  quantityByCategory: Record<string, number>

  // Payment method breakdown
  salesByPaymentMethod: Record<string, number>

  // Time-based metrics
  salesByDate: Record<string, number>

  // Top performers
  topSellingProducts: { sku: string; name: string; quantity: number; revenue: number }[]
  topRevenueProducts: { sku: string; name: string; revenue: number; profit: number }[]

  // Inventory value
  totalInventoryValue: number
  inventoryByCategory: Record<string, number>
}

// Import types
export type ImportType = 'products' | 'inventory' | 'sales' | 'unified'

export interface ColumnMapping {
  csvColumn: string
  dbField: string
}

export interface ImportValidationError {
  rowNumber: number
  field: string
  value: string
  message: string
}

export interface CSVRow {
  [key: string]: string
}

export interface ParsedCSV {
  headers: string[]
  rows: CSVRow[]
  totalRows: number
}

// Store state
interface StoreState {
  products: Product[]
  sales: Sale[]
  inventorySnapshots: InventorySnapshot[]

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product
  updateProduct: (id: string, updates: Partial<Product>) => void
  removeProduct: (id: string) => void
  getProductBySku: (sku: string) => Product | undefined

  // Sales actions
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => Sale
  removeSale: (id: string) => void
  getSaleByReceiptNumber: (receiptNumber: string) => Sale | undefined

  // Inventory actions
  addInventorySnapshot: (snapshot: Omit<InventorySnapshot, 'id'>) => void

  // Import actions
  importProducts: (products: Partial<Product>[]) => { added: number; updated: number; errors: string[] }
  importSales: (sales: Partial<Sale>[]) => { added: number; errors: string[] }
  importUnified: (data: CSVRow[], columnMapping: ColumnMapping[]) => { productsAdded: number; productsUpdated: number; salesAdded: number; errors: ImportValidationError[] }

  // Analytics
  getAnalytics: () => Analytics

  // Export
  exportProducts: () => string
  exportSales: () => string
  exportUnified: () => string
}

// Generate ID
const generateId = () => Math.random().toString(36).substring(2, 15)

// CSV line parser (handles quoted values)
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

// Parse CSV content
export function parseCSV(fileContent: string): ParsedCSV {
  const lines = fileContent.split('\n').filter(line => line.trim() !== '')
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse headers
  const headers = parseCSVLine(lines[0])
  if (headers.length === 0) {
    throw new Error('CSV has no headers')
  }

  // Parse rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0 && values.some(v => v.trim() !== '')) {
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  }
}

// Field synonyms for auto-mapping
export const FIELD_SYNONYMS: Record<string, string[]> = {
  sku: ['sku', 'product_code', 'item_code', 'code', 'product_id', 'item_number', 'upc', 'ean'],
  name: ['name', 'product_name', 'item_name', 'title', 'description', 'product_title'],
  description: ['description', 'product_description', 'details', 'long_description'],
  category: ['category', 'category_name', 'product_category', 'department', 'class'],
  barcode: ['barcode', 'upc', 'ean', 'scan_code', 'bar_code', 'ean13', 'gtin'],
  costPrice: ['cost_price', 'cost', 'unit_cost', 'purchase_price', 'buy_price', 'wholesale_price'],
  sellingPrice: ['selling_price', 'price', 'retail_price', 'unit_price', 'sale_price', 'list_price', 'amount'],
  taxRate: ['tax_rate', 'tax', 'vat_rate', 'gst_rate', 'tax_percentage', 'vat'],
  minStockLevel: ['min_stock_level', 'min_stock', 'minimum_stock', 'safety_stock', 'min_level'],
  maxStockLevel: ['max_stock_level', 'max_stock', 'maximum_stock', 'max_level'],
  reorderPoint: ['reorder_point', 'reorder_level', 'reorder_at', 'replenishment_point'],
  reorderQuantity: ['reorder_quantity', 'reorder_qty', 'replenishment_qty', 'order_quantity'],
  supplierName: ['supplier_name', 'supplier', 'vendor_name', 'vendor', 'distributor', 'manufacturer'],
  supplierContact: ['supplier_contact', 'vendor_contact', 'supplier_email', 'supplier_phone'],
  unitOfMeasure: ['unit_of_measure', 'uom', 'unit', 'measure', 'measurement', 'packaging'],
  isActive: ['is_active', 'active', 'status', 'enabled', 'visible'],
  stock: ['stock', 'stock_level', 'current_stock', 'inventory', 'on_hand', 'onhand', 'in_stock'],
  quantity: ['quantity', 'qty', 'amount', 'count', 'units', 'stock_quantity'],
  locationName: ['location_name', 'location', 'store_location', 'branch', 'warehouse'],
  receiptNumber: ['receipt_number', 'receipt_no', 'receipt_id', 'transaction_id', 'order_number', 'invoice_number', 'sale_id'],
  transactionDate: ['transaction_date', 'date', 'sale_date', 'order_date', 'datetime', 'timestamp', 'created_at'],
  discountAmount: ['discount_amount', 'discount', 'discount_value', 'markdown'],
  taxAmount: ['tax_amount', 'tax', 'sales_tax', 'vat_amount'],
  paymentMethod: ['payment_method', 'payment_type', 'payment', 'tender'],
  customerName: ['customer_name', 'customer', 'buyer_name', 'client_name'],
  customerEmail: ['customer_email', 'email', 'buyer_email'],
  customerPhone: ['customer_phone', 'phone', 'telephone', 'mobile'],
  cashierName: ['cashier_name', 'cashier', 'employee_name', 'staff_name', 'seller'],
  notes: ['notes', 'comments', 'remarks', 'note'],
}

// Suggest column mapping
export function suggestColumnMapping(headers: string[]): ColumnMapping[] {
  const mapping: ColumnMapping[] = []
  const usedHeaders = new Set<string>()

  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    for (const header of headers) {
      if (usedHeaders.has(header)) continue

      const headerLower = header.toLowerCase().trim()
      const isMatch = synonyms.some(syn =>
        headerLower === syn.toLowerCase() ||
        headerLower.replace(/[_\s-]/g, '') === syn.toLowerCase().replace(/[_\s-]/g, '')
      )

      if (isMatch) {
        mapping.push({ csvColumn: header, dbField: field })
        usedHeaders.add(header)
        break
      }
    }
  }

  return mapping
}

// Transform value based on type
function transformValue(value: string, field: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null

  // Number fields
  const numberFields = ['costPrice', 'sellingPrice', 'taxRate', 'stock', 'minStockLevel', 'maxStockLevel', 'reorderPoint', 'reorderQuantity', 'quantity', 'unitPrice', 'discountAmount', 'taxAmount']
  if (numberFields.includes(field)) {
    const num = parseFloat(trimmed.replace(/[$,]/g, ''))
    return isNaN(num) ? null : num
  }

  // Boolean fields
  if (field === 'isActive') {
    const lower = trimmed.toLowerCase()
    return ['true', '1', 'yes', 'y', 'active', 'enabled'].includes(lower)
  }

  // Date fields
  if (field === 'transactionDate') {
    const date = new Date(trimmed)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  return trimmed
}

// Create the store
export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      sales: [],
      inventorySnapshots: [],

      addProduct: (product) => {
        const now = new Date().toISOString()
        const newProduct: Product = {
          ...product as Product,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ products: [...state.products, newProduct] }))
        return newProduct
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }))
      },

      removeProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }))
      },

      getProductBySku: (sku) => {
        return get().products.find((p) => p.sku.toLowerCase() === sku.toLowerCase())
      },

      addSale: (sale) => {
        const newSale: Sale = {
          ...sale as Sale,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ sales: [...state.sales, newSale] }))
        return newSale
      },

      removeSale: (id) => {
        set((state) => ({
          sales: state.sales.filter((s) => s.id !== id),
        }))
      },

      getSaleByReceiptNumber: (receiptNumber) => {
        return get().sales.find((s) => s.receiptNumber === receiptNumber)
      },

      addInventorySnapshot: (snapshot) => {
        const newSnapshot: InventorySnapshot = {
          ...snapshot,
          id: generateId(),
        }
        set((state) => ({
          inventorySnapshots: [...state.inventorySnapshots, newSnapshot],
        }))
      },

      importProducts: (products) => {
        const result = { added: 0, updated: 0, errors: [] as string[] }

        products.forEach((product, index) => {
          if (!product.sku) {
            result.errors.push(`Row ${index + 1}: SKU is required`)
            return
          }
          if (!product.name) {
            result.errors.push(`Row ${index + 1}: Name is required for SKU ${product.sku}`)
            return
          }
          if (!product.sellingPrice) {
            result.errors.push(`Row ${index + 1}: Selling price is required for SKU ${product.sku}`)
            return
          }

          const existing = get().getProductBySku(product.sku)
          if (existing) {
            get().updateProduct(existing.id, { ...product, updatedAt: new Date().toISOString() })
            result.updated++
          } else {
            get().addProduct(product as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>)
            result.added++
          }
        })

        return result
      },

      importSales: (sales) => {
        const result = { added: 0, errors: [] as string[] }

        sales.forEach((sale, index) => {
          if (!sale.receiptNumber) {
            result.errors.push(`Row ${index + 1}: Receipt number is required`)
            return
          }
          if (!sale.transactionDate) {
            result.errors.push(`Row ${index + 1}: Transaction date is required for receipt ${sale.receiptNumber}`)
            return
          }

          const existing = get().getSaleByReceiptNumber(sale.receiptNumber)
          if (!existing) {
            get().addSale(sale as Omit<Sale, 'id' | 'createdAt'>)
            result.added++
          }
        })

        return result
      },

      importUnified: (rows, columnMapping) => {
        const errors: ImportValidationError[] = []
        let productsAdded = 0
        let productsUpdated = 0
        let salesAdded = 0

        // Build field mapping
        const fieldMap = new Map<string, string>()
        columnMapping.forEach((m) => {
          fieldMap.set(m.csvColumn, m.dbField)
        })

        // Group sales by receipt number
        const salesByReceipt = new Map<string, Omit<Sale, 'id' | 'createdAt'> & { lineItems: Partial<SaleLineItem>[] }>()

        rows.forEach((row, rowIndex) => {
          const rowNumber = rowIndex + 1

          // Transform row data
          const data: Record<string, unknown> = {}
          for (const [csvColumn, value] of Object.entries(row)) {
            const dbField = fieldMap.get(csvColumn)
            if (dbField) {
              data[dbField] = transformValue(value, dbField)
            }
          }

          // Check if this is a sales row (has receipt_number)
          const isSalesRow = data.receiptNumber && String(data.receiptNumber).trim() !== ''

          if (!isSalesRow) {
            // Product row
            if (!data.sku) {
              errors.push({ rowNumber, field: 'sku', value: '', message: 'SKU is required' })
              return
            }
            if (!data.name) {
              errors.push({ rowNumber, field: 'name', value: '', message: 'Name is required for new products' })
              return
            }
            if (!data.sellingPrice) {
              errors.push({ rowNumber, field: 'sellingPrice', value: '', message: 'Selling price is required' })
              return
            }

            const existing = get().getProductBySku(String(data.sku))
            const productData: Partial<Product> = {
              sku: String(data.sku),
              name: String(data.name),
              description: data.description as string | undefined,
              category: data.category as string | undefined,
              barcode: data.barcode as string | undefined,
              costPrice: data.costPrice as number | undefined,
              sellingPrice: data.sellingPrice as number,
              taxRate: data.taxRate as number | undefined,
              stock: data.stock as number | undefined,
              minStockLevel: data.minStockLevel as number | undefined,
              maxStockLevel: data.maxStockLevel as number | undefined,
              reorderPoint: data.reorderPoint as number | undefined,
              reorderQuantity: data.reorderQuantity as number | undefined,
              unitOfMeasure: data.unitOfMeasure as string | undefined,
              supplierName: data.supplierName as string | undefined,
              supplierContact: data.supplierContact as string | undefined,
              isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
            }

            if (existing) {
              get().updateProduct(existing.id, productData)
              productsUpdated++
            } else {
              get().addProduct(productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>)
              productsAdded++
            }

            // Create inventory snapshot if stock is provided
            if (data.stock && !existing) {
              const product = get().getProductBySku(String(data.sku))
              if (product) {
                get().addInventorySnapshot({
                  productId: product.id,
                  quantity: Number(data.stock),
                  snapshotDate: new Date().toISOString().split('T')[0],
                  notes: 'Imported from unified CSV',
                })
              }
            }
          } else {
            // Sales row - group by receipt number
            const receiptNumber = String(data.receiptNumber)
            const lineItem: Partial<SaleLineItem> = {
              productId: data.sku ? get().getProductBySku(String(data.sku))?.id : undefined,
              productName: (data.productName as string) || (data.sku ? String(data.sku) : 'Unknown Product'),
              productSku: data.sku as string | undefined,
              quantity: (data.quantity as number) || 1,
              unitPrice: (data.unitPrice as number) || 0,
              discountAmount: (data.discountAmount as number) || 0,
              taxAmount: (data.taxAmount as number) || 0,
              totalAmount: ((data.quantity as number) || 1) * ((data.unitPrice as number) || 0) - ((data.discountAmount as number) || 0) + ((data.taxAmount as number) || 0),
              costPrice: data.sku ? get().getProductBySku(String(data.sku))?.costPrice : undefined,
            }

            if (!salesByReceipt.has(receiptNumber)) {
              salesByReceipt.set(receiptNumber, {
                receiptNumber,
                transactionDate: data.transactionDate as string,
                locationName: data.locationName as string | undefined,
                paymentMethod: (data.paymentMethod as string) || 'other',
                customerName: data.customerName as string | undefined,
                customerEmail: data.customerEmail as string | undefined,
                customerPhone: data.customerPhone as string | undefined,
                cashierName: data.cashierName as string | undefined,
                notes: data.notes as string | undefined,
                lineItems: [],
                subtotal: 0,
                taxAmount: 0,
                discountAmount: 0,
                totalAmount: 0,
              })
            }

            const sale = salesByReceipt.get(receiptNumber)!
            sale.lineItems.push(lineItem)
            sale.subtotal = (sale.subtotal || 0) + (lineItem.totalAmount || 0) - (lineItem.taxAmount || 0)
            sale.taxAmount = (sale.taxAmount || 0) + (lineItem.taxAmount || 0)
            sale.discountAmount = (sale.discountAmount || 0) + (lineItem.discountAmount || 0)
            sale.totalAmount = (sale.totalAmount || 0) + (lineItem.totalAmount || 0)
          }
        })

        // Create sales from grouped data
        salesByReceipt.forEach((saleData) => {
          const existing = get().getSaleByReceiptNumber(saleData.receiptNumber)
          if (!existing) {
            get().addSale(saleData as Omit<Sale, 'id' | 'createdAt'>)
            salesAdded++
          }
        })

        return { productsAdded, productsUpdated, salesAdded, errors }
      },

      getAnalytics: () => {
        const { products, sales } = get()

        // Sales metrics
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0)
        const totalSales = sales.length
        const totalItemsSold = sales.reduce((sum, s) => sum + s.lineItems.reduce((liSum, li) => liSum + li.quantity, 0), 0)
        const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0
        const averageItemsPerTransaction = totalSales > 0 ? totalItemsSold / totalSales : 0

        // Product metrics
        const totalProducts = products.length
        const activeProducts = products.filter((p) => p.isActive).length
        const lowStockProducts = products.filter((p) => {
          if (!p.stock || !p.minStockLevel) return false
          return p.stock <= p.minStockLevel
        }).length
        const outOfStockProducts = products.filter((p) => p.stock === 0).length

        // Profit metrics
        const totalCost = sales.reduce((sum, s) =>
          sum + s.lineItems.reduce((liSum, li) => liSum + ((li.costPrice || 0) * li.quantity), 0), 0)
        const grossProfit = totalRevenue - totalCost
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

        // Category breakdown
        const salesByCategory: Record<string, number> = {}
        const quantityByCategory: Record<string, number> = {}
        sales.forEach((sale) => {
          sale.lineItems.forEach((item) => {
            const product = products.find((p) => p.id === item.productId)
            const category = product?.category || 'Uncategorized'
            salesByCategory[category] = (salesByCategory[category] || 0) + item.totalAmount
            quantityByCategory[category] = (quantityByCategory[category] || 0) + item.quantity
          })
        })

        // Payment method breakdown
        const salesByPaymentMethod: Record<string, number> = {}
        sales.forEach((sale) => {
          salesByPaymentMethod[sale.paymentMethod] = (salesByPaymentMethod[sale.paymentMethod] || 0) + sale.totalAmount
        })

        // Time-based metrics
        const salesByDate: Record<string, number> = {}
        sales.forEach((sale) => {
          const date = sale.transactionDate.split('T')[0]
          salesByDate[date] = (salesByDate[date] || 0) + sale.totalAmount
        })

        // Top selling products
        const productSales: Record<string, { sku: string; name: string; quantity: number; revenue: number }> = {}
        sales.forEach((sale) => {
          sale.lineItems.forEach((item) => {
            const key = item.productSku || item.productName
            if (!productSales[key]) {
              productSales[key] = { sku: item.productSku || 'N/A', name: item.productName, quantity: 0, revenue: 0 }
            }
            productSales[key].quantity += item.quantity
            productSales[key].revenue += item.totalAmount
          })
        })
        const topSellingProducts = Object.values(productSales)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10)

        // Top revenue products
        const topRevenueProducts = Object.values(productSales)
          .map((p) => ({
            ...p,
            profit: p.revenue - (products.find((prod) => prod.sku === p.sku)?.costPrice || 0) * p.quantity,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)

        // Inventory value
        const totalInventoryValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.costPrice || 0)), 0)
        const inventoryByCategory: Record<string, number> = {}
        products.forEach((p) => {
          if (p.category) {
            inventoryByCategory[p.category] = (inventoryByCategory[p.category] || 0) + ((p.stock || 0) * (p.costPrice || 0))
          }
        })

        return {
          totalRevenue,
          totalSales,
          totalItemsSold,
          averageOrderValue,
          averageItemsPerTransaction,
          totalProducts,
          activeProducts,
          lowStockProducts,
          outOfStockProducts,
          totalCost,
          grossProfit,
          grossMargin,
          salesByCategory,
          quantityByCategory,
          salesByPaymentMethod,
          salesByDate,
          topSellingProducts,
          topRevenueProducts,
          totalInventoryValue,
          inventoryByCategory,
        }
      },

      exportProducts: () => {
        const { products } = get()
        const headers = ['sku', 'name', 'description', 'category', 'barcode', 'selling_price', 'cost_price', 'tax_rate', 'stock', 'min_stock_level', 'max_stock_level', 'reorder_point', 'reorder_quantity', 'unit_of_measure', 'supplier_name', 'supplier_contact', 'is_active']

        const rows: (string | number | boolean)[][] = products.map((p) => [
          p.sku,
          p.name,
          p.description || '',
          p.category || '',
          p.barcode || '',
          p.sellingPrice,
          p.costPrice || '',
          p.taxRate || '',
          p.stock || '',
          p.minStockLevel || '',
          p.maxStockLevel || '',
          p.reorderPoint || '',
          p.reorderQuantity || '',
          p.unitOfMeasure || '',
          p.supplierName || '',
          p.supplierContact || '',
          p.isActive,
        ])

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      },

      exportSales: () => {
        const { sales } = get()
        const headers = ['receipt_number', 'transaction_date', 'location_name', 'product_sku', 'product_name', 'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'payment_method', 'customer_name', 'customer_email', 'customer_phone', 'cashier_name', 'notes']

        const rows: (string | number)[][] = []
        sales.forEach((sale) => {
          sale.lineItems.forEach((item) => {
            rows.push([
              sale.receiptNumber,
              sale.transactionDate,
              sale.locationName || '',
              item.productSku || '',
              item.productName,
              item.quantity,
              item.unitPrice,
              item.discountAmount,
              item.taxAmount,
              sale.paymentMethod,
              sale.customerName || '',
              sale.customerEmail || '',
              sale.customerPhone || '',
              sale.cashierName || '',
              sale.notes || '',
            ])
          })
        })

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      },

      exportUnified: () => {
        const { products, sales } = get()

        // All unified headers
        const headers = ['sku', 'name', 'description', 'category', 'barcode', 'selling_price', 'cost_price', 'tax_rate', 'stock', 'min_stock_level', 'max_stock_level', 'reorder_point', 'reorder_quantity', 'unit_of_measure', 'supplier_name', 'supplier_contact', 'is_active', 'receipt_number', 'transaction_date', 'location_name', 'quantity', 'unit_price', 'discount_amount', 'tax_amount', 'payment_method', 'customer_name', 'customer_email', 'customer_phone', 'cashier_name', 'notes']

        // Product rows (no receipt_number)
        const productRows: (string | number | boolean)[][] = products.map((p) => [
          p.sku,
          p.name,
          p.description || '',
          p.category || '',
          p.barcode || '',
          p.sellingPrice,
          p.costPrice || '',
          p.taxRate || '',
          p.stock || '',
          p.minStockLevel || '',
          p.maxStockLevel || '',
          p.reorderPoint || '',
          p.reorderQuantity || '',
          p.unitOfMeasure || '',
          p.supplierName || '',
          p.supplierContact || '',
          p.isActive,
          '', '', '', '', '', '', '', '', '', '', '', '',
        ])

        // Sales rows (have receipt_number)
        const salesRows: (string | number | boolean)[][] = []
        sales.forEach((sale) => {
          sale.lineItems.forEach((item) => {
            salesRows.push([
              item.productSku || '',
              item.productName,
              '', '', '', '', '', '', '', '', '', '', '', '', '', '',
              true, // is_active placeholder
              sale.receiptNumber,
              sale.transactionDate,
              sale.locationName || '',
              item.quantity,
              item.unitPrice,
              item.discountAmount,
              item.taxAmount,
              sale.paymentMethod,
              sale.customerName || '',
              sale.customerEmail || '',
              sale.customerPhone || '',
              sale.cashierName || '',
              sale.notes || '',
            ])
          })
        })

        return [headers.join(','), ...productRows.map((r) => r.join(',')), ...salesRows.map((r) => r.join(','))].join('\n')
      },
    }),
    {
      name: 'storepilot-storage',
    }
  )
)
