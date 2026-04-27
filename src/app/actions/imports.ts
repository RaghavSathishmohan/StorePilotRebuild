'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkStorePermission } from '@/lib/permissions'

// Parse CSV content
export async function parseCSV(fileContent: string): Promise<{ headers: string[]; rows: Record<string, string>[]; totalRows: number }> {
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
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0 && values.some(v => v.trim() !== '')) {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }
  }

  return { headers, rows, totalRows: rows.length }
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
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

// Field synonyms for auto-mapping
const FIELD_SYNONYMS: Record<string, string[]> = {
  sku: ['sku', 'product_code', 'item_code', 'code', 'product_id', 'item_number', 'upc', 'ean'],
  name: ['name', 'product_name', 'item_name', 'title', 'description'],
  category: ['category', 'category_name', 'product_category', 'department'],
  barcode: ['barcode', 'upc', 'ean', 'scan_code', 'bar_code'],
  cost_price: ['cost_price', 'cost', 'unit_cost', 'purchase_price', 'buy_price'],
  selling_price: ['selling_price', 'price', 'retail_price', 'unit_price', 'sale_price'],
  tax_rate: ['tax_rate', 'tax', 'vat_rate', 'gst_rate'],
  stock: ['stock', 'stock_level', 'current_stock', 'inventory', 'on_hand', 'onhand'],
  min_stock_level: ['min_stock_level', 'min_stock', 'minimum_stock', 'safety_stock'],
  max_stock_level: ['max_stock_level', 'max_stock', 'maximum_stock'],
  reorder_point: ['reorder_point', 'reorder_level', 'replenishment_point'],
  reorder_quantity: ['reorder_quantity', 'order_quantity'],
  supplier_name: ['supplier_name', 'supplier', 'vendor'],
  supplier_contact: ['supplier_contact', 'vendor_contact'],
  unit_of_measure: ['unit_of_measure', 'uom', 'unit'],
  is_active: ['is_active', 'active', 'status'],
  receipt_number: ['receipt_number', 'receipt_no', 'transaction_id', 'order_number', 'invoice_number'],
  transaction_date: ['transaction_date', 'date', 'sale_date', 'datetime'],
  location_name: ['location_name', 'location', 'store_location'],
  quantity: ['quantity', 'qty', 'amount', 'count'],
  unit_price: ['unit_price', 'price', 'sale_price'],
  discount_amount: ['discount_amount', 'discount'],
  tax_amount: ['tax_amount', 'sales_tax'],
  payment_method: ['payment_method', 'payment_type', 'payment'],
  customer_name: ['customer_name', 'customer', 'buyer_name'],
  customer_email: ['customer_email', 'email'],
  customer_phone: ['customer_phone', 'phone'],
  cashier_name: ['cashier_name', 'cashier'],
  notes: ['notes', 'comments', 'remarks'],
}

// Suggest column mapping based on headers
export async function suggestColumnMapping(headers: string[], importType: string): Promise<{ csvColumn: string; dbField: string; confidence: 'high' | 'medium' | 'low' }[]> {
  const mapping: { csvColumn: string; dbField: string; confidence: 'high' | 'medium' | 'low' }[] = []
  const usedHeaders = new Set<string>()
  const fields = getFieldsForImportType(importType)

  for (const field of fields) {
    const synonyms = FIELD_SYNONYMS[field.name] || [field.name]

    for (const header of headers) {
      if (usedHeaders.has(header)) continue

      const headerLower = header.toLowerCase().trim()
      const exactMatch = synonyms.some(s => headerLower === s.toLowerCase())
      const normalizedMatch = synonyms.some(s =>
        headerLower.replace(/[_\s-]/g, '') === s.toLowerCase().replace(/[_\s-]/g, '')
      )

      if (exactMatch) {
        mapping.push({ csvColumn: header, dbField: field.name, confidence: 'high' })
        usedHeaders.add(header)
        break
      } else if (normalizedMatch) {
        mapping.push({ csvColumn: header, dbField: field.name, confidence: 'medium' })
        usedHeaders.add(header)
        break
      }
    }
  }

  return mapping
}

// Get field definitions for import type
function getFieldsForImportType(importType: string): { name: string; required: boolean; type: string }[] {
  const fields: Record<string, { name: string; required: boolean; type: string }[]> = {
    products: [
      { name: 'sku', required: true, type: 'string' },
      { name: 'name', required: true, type: 'string' },
      { name: 'selling_price', required: true, type: 'number' },
      { name: 'category', required: false, type: 'string' },
      { name: 'barcode', required: false, type: 'string' },
      { name: 'cost_price', required: false, type: 'number' },
      { name: 'tax_rate', required: false, type: 'number' },
      { name: 'stock', required: false, type: 'integer' },
      { name: 'min_stock_level', required: false, type: 'integer' },
      { name: 'max_stock_level', required: false, type: 'integer' },
      { name: 'reorder_point', required: false, type: 'integer' },
      { name: 'reorder_quantity', required: false, type: 'integer' },
      { name: 'unit_of_measure', required: false, type: 'string' },
      { name: 'supplier_name', required: false, type: 'string' },
      { name: 'supplier_contact', required: false, type: 'string' },
      { name: 'is_active', required: false, type: 'boolean' },
    ],
    sales: [
      { name: 'receipt_number', required: true, type: 'string' },
      { name: 'transaction_date', required: true, type: 'datetime' },
      { name: 'sku', required: false, type: 'string' },
      { name: 'product_name', required: false, type: 'string' },
      { name: 'quantity', required: true, type: 'integer' },
      { name: 'unit_price', required: true, type: 'number' },
      { name: 'discount_amount', required: false, type: 'number' },
      { name: 'tax_amount', required: false, type: 'number' },
      { name: 'payment_method', required: false, type: 'string' },
      { name: 'location_name', required: false, type: 'string' },
      { name: 'customer_name', required: false, type: 'string' },
      { name: 'customer_email', required: false, type: 'string' },
      { name: 'customer_phone', required: false, type: 'string' },
      { name: 'cashier_name', required: false, type: 'string' },
      { name: 'notes', required: false, type: 'string' },
    ],
    unified: [
      // Product fields
      { name: 'sku', required: false, type: 'string' },
      { name: 'name', required: false, type: 'string' },
      { name: 'category', required: false, type: 'string' },
      { name: 'barcode', required: false, type: 'string' },
      { name: 'cost_price', required: false, type: 'number' },
      { name: 'selling_price', required: false, type: 'number' },
      { name: 'tax_rate', required: false, type: 'number' },
      { name: 'stock', required: false, type: 'integer' },
      { name: 'min_stock_level', required: false, type: 'integer' },
      { name: 'max_stock_level', required: false, type: 'integer' },
      { name: 'reorder_point', required: false, type: 'integer' },
      { name: 'reorder_quantity', required: false, type: 'integer' },
      { name: 'unit_of_measure', required: false, type: 'string' },
      { name: 'supplier_name', required: false, type: 'string' },
      { name: 'supplier_contact', required: false, type: 'string' },
      { name: 'is_active', required: false, type: 'boolean' },
      // Sales fields
      { name: 'receipt_number', required: false, type: 'string' },
      { name: 'transaction_date', required: false, type: 'datetime' },
      { name: 'quantity', required: false, type: 'integer' },
      { name: 'unit_price', required: false, type: 'number' },
      { name: 'discount_amount', required: false, type: 'number' },
      { name: 'tax_amount', required: false, type: 'number' },
      { name: 'payment_method', required: false, type: 'string' },
      { name: 'location_name', required: false, type: 'string' },
      { name: 'customer_name', required: false, type: 'string' },
      { name: 'customer_email', required: false, type: 'string' },
      { name: 'customer_phone', required: false, type: 'string' },
      { name: 'cashier_name', required: false, type: 'string' },
      { name: 'notes', required: false, type: 'string' },
    ],
  }
  return fields[importType] || []
}

// Preview import - validate all rows without saving
export async function previewImport(
  parsedCSV: { headers: string[]; rows: Record<string, string>[]; totalRows: number },
  importType: string,
  columnMapping: { csvColumn: string; dbField: string }[],
  storeId: string
) {
  const errors: { rowNumber: number; field: string; value: string; message: string }[] = []
  const warnings: { rowNumber: number; field: string; value: string; message: string }[] = []
  let validCount = 0
  let invalidCount = 0

  const fieldMap = new Map(columnMapping.map(m => [m.csvColumn, m.dbField]))

  // Validate ALL rows
  for (let i = 0; i < parsedCSV.rows.length; i++) {
    const row = parsedCSV.rows[i]
    const rowNumber = i + 1
    const rowErrors: { rowNumber: number; field: string; value: string; message: string }[] = []

    // Transform row data
    const data: Record<string, unknown> = {}
    for (const [csvColumn, value] of Object.entries(row)) {
      const dbField = fieldMap.get(csvColumn)
      if (dbField) {
        data[dbField] = transformValue(value, dbField)
      }
    }

    // Validate based on import type
    if (importType === 'unified') {
      // Check if sales row (has receipt_number)
      const isSalesRow = data.receipt_number && String(data.receipt_number).trim() !== ''

      if (!isSalesRow) {
        // Product validation
        if (!data.sku) {
          rowErrors.push({ rowNumber, field: 'sku', value: '', message: 'SKU is required for product rows' })
        }
        if (!data.name) {
          rowErrors.push({ rowNumber, field: 'name', value: '', message: 'Name is required for new products' })
        }
        if (!data.selling_price) {
          rowErrors.push({ rowNumber, field: 'selling_price', value: '', message: 'Selling price is required' })
        }
      } else {
        // Sales validation
        if (!data.receipt_number) {
          rowErrors.push({ rowNumber, field: 'receipt_number', value: '', message: 'Receipt number is required' })
        }
        if (!data.transaction_date) {
          rowErrors.push({ rowNumber, field: 'transaction_date', value: '', message: 'Transaction date is required' })
        }
      }
    }

    if (rowErrors.length === 0) {
      validCount++
    } else {
      invalidCount++
      errors.push(...rowErrors)
    }
  }

  return {
    totalRows: parsedCSV.totalRows,
    validRows: validCount,
    invalidRows: invalidCount,
    previewRows: parsedCSV.rows.length,
    errors: errors.slice(0, 100), // Limit errors shown
    warnings,
  }
}

// Transform value based on field type
function transformValue(value: string, field: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null

  // Number fields
  const numberFields = ['cost_price', 'selling_price', 'tax_rate', 'stock', 'min_stock_level', 'max_stock_level', 'quantity', 'unit_price', 'discount_amount', 'tax_amount']
  if (numberFields.includes(field)) {
    const num = parseFloat(trimmed.replace(/[$,]/g, ''))
    return isNaN(num) ? null : num
  }

  // Boolean fields
  if (field === 'is_active') {
    const lower = trimmed.toLowerCase()
    return ['true', '1', 'yes', 'y'].includes(lower)
  }

  // Date fields
  if (field === 'transaction_date') {
    const date = new Date(trimmed)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  return trimmed
}

// Create import record
export async function createImport(
  storeId: string,
  importType: string,
  fileName: string,
  fileContent: string,
  columnMapping: { csvColumn: string; dbField: string; confidence?: string }[]
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  // Check permission
  const { allowed } = await checkStorePermission(storeId, user.id, 'admin')
  if (!allowed) {
    throw new Error('Only store admins can import data')
  }

  const fileSize = Buffer.byteLength(fileContent, 'utf8')

  // Calculate mapping accuracy
  const fields = getFieldsForImportType(importType)
  const requiredFields = fields.filter(f => f.required).map(f => f.name)
  const mappedFields = columnMapping.map(m => m.dbField)
  const matchedRequired = requiredFields.filter(f => mappedFields.includes(f)).length
  const mappingAccuracy = requiredFields.length > 0 ? Math.round((matchedRequired / requiredFields.length) * 100) : 100

  const { data: importRecord, error } = await (supabase
    .from('imports') as any)
    .insert({
      store_id: storeId,
      import_type: importType,
      file_name: fileName,
      file_size_bytes: fileSize,
      file_format: 'csv',
      status: 'pending',
      mapping_config: columnMapping,
      mapping_accuracy: mappingAccuracy,
      column_mapping_details: columnMapping,
      initiated_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create import: ${error.message}`)
  }

  return { id: (importRecord as { id: string }).id }
}

// Process import
export async function processImport(
  importId: string,
  parsedCSV: { rows: Record<string, string>[] },
  importType: string,
  columnMapping: { csvColumn: string; dbField: string }[],
  storeId: string
) {
  const serviceClient = createServiceClient()

  // Get import details
  const { data: importRecord, error: importError } = await (serviceClient
    .from('imports') as any)
    .select('*')
    .eq('id', importId)
    .single()

  if (importError || !importRecord) {
    return { success: false, error: 'Import not found' }
  }

  // Update status to processing
  await (serviceClient
    .from('imports') as any)
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', importId)

  const startTime = Date.now()
  let processedRows = 0
  let successfulRows = 0
  let failedRows = 0
  const errorLog: { rowNumber: number; field: string; value: string; message: string }[] = []

  const fieldMap = new Map(columnMapping.map(m => [m.csvColumn, m.dbField]))

  try {
    // Get existing categories and products for lookups
    const { data: existingCategories } = await serviceClient
      .from('product_categories')
      .select('id, name')
      .eq('store_id', storeId)

    const categoryMap = new Map((existingCategories || []).map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id]))

    const { data: existingProducts } = await serviceClient
      .from('products')
      .select('id, sku, cost_price')
      .eq('store_id', storeId)

    const typedExistingProducts = (existingProducts || []) as { id: string; sku: string; cost_price: number | null }[]

    const productMap = new Map(typedExistingProducts.map((p) => [p.sku.toLowerCase(), p.id]))
    const productsList = typedExistingProducts

    // Collect all unique categories from the import
    const categoriesToCreate = new Set<string>()
    const productsToInsert: any[] = []
    const productsToUpdate: { id: string; data: any }[] = []

    // First pass: categorize rows and collect data
    for (const row of parsedCSV.rows) {
      const data: Record<string, unknown> = {}
      for (const [csvColumn, value] of Object.entries(row)) {
        const dbField = fieldMap.get(csvColumn)
        if (dbField) {
          data[dbField] = transformValue(value, dbField)
        }
      }

      // Check if sales row for unified imports
      const isSalesRow = importType === 'unified' && data.receipt_number

      if (importType === 'products' || (importType === 'unified' && !isSalesRow)) {
        if (!data.sku) continue

        // Collect categories to create
        if (data.category) {
          const catName = String(data.category).toLowerCase()
          if (!categoryMap.has(catName)) {
            categoriesToCreate.add(String(data.category))
          }
        }

        const sku = String(data.sku).toLowerCase()
        const existingId = productMap.get(sku)

        const productData = {
          store_id: storeId,
          sku: String(data.sku),
          name: String(data.name),
          description: data.description || null,
          category_id: data.category ? null : null, // Will fill in after categories created
          category_name: data.category || null, // Store temporarily
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

        if (existingId) {
          productsToUpdate.push({ id: existingId, data: productData })
        } else {
          productsToInsert.push(productData)
        }
      }
    }

    // Batch create new categories
    if (categoriesToCreate.size > 0) {
      const newCategories = Array.from(categoriesToCreate).map(name => ({
        store_id: storeId,
        name: name,
      }))

      const { data: createdCats } = await (serviceClient
        .from('product_categories') as any)
        .insert(newCategories)
        .select('id, name')

      if (createdCats) {
        for (const cat of createdCats) {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        }
      }
    }

    // Resolve category IDs for products
    for (const product of productsToInsert) {
      if (product.category_name) {
        product.category_id = categoryMap.get(product.category_name.toLowerCase()) || null
      }
      delete product.category_name // Remove temp field
    }

    for (const product of productsToUpdate) {
      if (product.data.category_name) {
        product.data.category_id = categoryMap.get(product.data.category_name.toLowerCase()) || null
      }
      delete product.data.category_name // Remove temp field
    }

    // Batch insert new products
    if (productsToInsert.length > 0) {
      const batchSize = 500
      for (let i = 0; i < productsToInsert.length; i += batchSize) {
        const batch = productsToInsert.slice(i, i + batchSize)
        const { data: inserted } = await (serviceClient
          .from('products') as any)
          .insert(batch)
          .select('id, sku')

        if (inserted) {
          for (const product of inserted) {
            productMap.set(product.sku.toLowerCase(), product.id)
          }
          successfulRows += batch.length
        }
      }
    }

    // Batch update existing products
    if (productsToUpdate.length > 0) {
      const batchSize = 100
      for (let i = 0; i < productsToUpdate.length; i += batchSize) {
        const batch = productsToUpdate.slice(i, i + batchSize)
        for (const { id, data } of batch) {
          await (serviceClient.from('products') as any).update(data).eq('id', id)
        }
        successfulRows += batch.length
      }
    }

    // Create inventory snapshots for new products with stock
    const productsWithStock = productsToInsert.filter(p => p.stock > 0)
    if (productsWithStock.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const snapshots = productsWithStock.map(p => ({
        store_id: storeId,
        product_id: productMap.get(p.sku.toLowerCase()),
        quantity: p.stock,
        snapshot_date: today,
        notes: 'Imported from CSV',
      })).filter(s => s.product_id)

      if (snapshots.length > 0) {
        const batchSize = 500
        for (let i = 0; i < snapshots.length; i += batchSize) {
          await (serviceClient.from('inventory_snapshots') as any).insert(snapshots.slice(i, i + batchSize))
        }
      }
    }

    // Process sales if this is a sales import
    if (importType === 'sales') {
      // Group rows by receipt_number
      const receiptsMap: Map<string, {
        receipt_number: string
        transaction_date: string
        payment_method: string
        total_amount: number
        items: any[]
      }> = new Map()

      for (const row of parsedCSV.rows) {
        const data: Record<string, unknown> = {}
        for (const [csvColumn, value] of Object.entries(row)) {
          const dbField = fieldMap.get(csvColumn)
          if (dbField) {
            data[dbField] = transformValue(value, dbField)
          }
        }

        const receiptNum = String(data.receipt_number || '')
        if (!receiptNum) continue

        if (!receiptsMap.has(receiptNum)) {
          receiptsMap.set(receiptNum, {
            receipt_number: receiptNum,
            transaction_date: String(data.transaction_date || new Date().toISOString()),
            payment_method: String(data.payment_method || 'other'),
            total_amount: Number(data.total_amount || 0),
            items: []
          })
        }

        const receipt = receiptsMap.get(receiptNum)!
        const sku = String(data.sku || '')
        const productId = productMap.get(sku.toLowerCase())

        // Look up product cost for profit calculation
        const productCost = productId ?
          productsList.find(p => p.id === productId)?.cost_price : null

        receipt.items.push({
          product_id: productId,
          product_sku: sku,
          product_name: String(data.product_name || data.name || 'Unknown'),
          quantity: Number(data.quantity || 1),
          unit_price: Number(data.unit_price || 0),
          discount_amount: Number(data.discount_amount || 0),
          tax_amount: Number(data.tax_amount || 0),
          cost_price: productCost || 0,
          total_amount: (Number(data.unit_price || 0) * Number(data.quantity || 1)) - Number(data.discount_amount || 0)
        })
      }

      // Create receipts and line items in BATCHES for better performance
      const receiptsList = Array.from(receiptsMap.values())
      const receiptBatchSize = 500
      const lineItemsBatch: any[] = []

      for (let i = 0; i < receiptsList.length; i += receiptBatchSize) {
        const batch = receiptsList.slice(i, i + receiptBatchSize)

        // Prepare receipt data with calculated totals
        const receiptsData = batch.map(receiptData => {
          const subtotal = receiptData.items.reduce((sum, item) =>
            sum + (item.unit_price * item.quantity), 0)
          const discountTotal = receiptData.items.reduce((sum, item) =>
            sum + item.discount_amount, 0)
          const taxTotal = receiptData.items.reduce((sum, item) =>
            sum + item.tax_amount, 0)
          const total = subtotal - discountTotal + taxTotal

          return {
            store_id: storeId,
            receipt_number: receiptData.receipt_number,
            transaction_date: receiptData.transaction_date,
            payment_method: receiptData.payment_method,
            subtotal: subtotal,
            discount_amount: discountTotal,
            tax_amount: taxTotal,
            total_amount: total,
            payment_status: 'completed',
          }
        })

        try {
          // Batch insert receipts
          const { data: insertedReceipts, error: receiptError } = await (serviceClient
            .from('sales_receipts') as any)
            .insert(receiptsData)
            .select('id, receipt_number')

          if (receiptError) throw receiptError

          // Map receipt numbers to IDs and collect line items
          if (insertedReceipts) {
            const receiptIdMap = new Map(insertedReceipts.map((r: { receipt_number: string; id: string }) => [r.receipt_number, r.id]))

            for (const receiptData of batch) {
              const receiptId = receiptIdMap.get(receiptData.receipt_number)
              if (receiptId && receiptData.items.length > 0) {
                for (const item of receiptData.items) {
                  lineItemsBatch.push({
                    receipt_id: receiptId,
                    ...item
                  })
                }
              }
            }
          }

          successfulRows += batch.length
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to create receipts'
          errorLog.push({
            rowNumber: i,
            field: 'receipt',
            value: batch.map(r => r.receipt_number).join(', '),
            message: errorMsg
          })
          failedRows += batch.length
        }
      }

      // Batch insert all line items
      if (lineItemsBatch.length > 0) {
        const lineItemBatchSize = 1000
        for (let i = 0; i < lineItemsBatch.length; i += lineItemBatchSize) {
          const batch = lineItemsBatch.slice(i, i + lineItemBatchSize)
          try {
            await (serviceClient.from('sale_line_items') as any).insert(batch)
            successfulRows += batch.length
          } catch (err) {
            console.error('Error inserting line items batch:', err)
            failedRows += batch.length
          }
        }
      }

      processedRows = parsedCSV.rows.length
    } else {
      processedRows = parsedCSV.rows.length
    }

    // Update import status
    const processingTime = Date.now() - startTime
    const finalStatus = failedRows === 0 ? 'completed' : successfulRows > 0 ? 'partial' : 'failed'

    await (serviceClient
      .from('imports') as any)
      .update({
        status: finalStatus,
        total_rows: parsedCSV.rows.length,
        processed_rows: processedRows,
        successful_rows: successfulRows,
        failed_rows: failedRows,
        error_log: errorLog.slice(0, 100),
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
      })
      .eq('id', importId)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/products')
    revalidatePath('/dashboard/analytics')

    return { success: true, processed: processedRows, successful: successfulRows, failed: failedRows }
  } catch (err) {
    await (serviceClient
      .from('imports') as any)
      .update({
        status: 'failed',
        error_log: [{ rowNumber: 0, field: 'system', value: '', message: err instanceof Error ? err.message : 'Unknown error' }],
        completed_at: new Date().toISOString(),
      })
      .eq('id', importId)

    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Get imports for a store
export async function getImports(storeId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: imports, error } = await (supabase
    .from('imports') as any)
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching imports:', error)
    return []
  }

  return imports || []
}

// Get import details
export async function getImportDetails(importId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: importRecord } = await (supabase
    .from('imports') as any)
    .select('*')
    .eq('id', importId)
    .single()

  if (!importRecord) {
    return null
  }

  const { data: rowDetails } = await (supabase
    .from('import_row_details') as any)
    .select('*')
    .eq('import_id', importId)
    .order('row_number', { ascending: true })

  return {
    import: importRecord,
    rowDetails: rowDetails || [],
  }
}
