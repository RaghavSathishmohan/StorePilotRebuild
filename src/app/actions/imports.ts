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
      { name: 'selling_price', required: false, type: 'number' },
      { name: 'category', required: false, type: 'string' },
      { name: 'cost_price', required: false, type: 'number' },
      { name: 'stock', required: false, type: 'integer' },
      // Sales fields
      { name: 'receipt_number', required: false, type: 'string' },
      { name: 'transaction_date', required: false, type: 'datetime' },
      { name: 'quantity', required: false, type: 'integer' },
      { name: 'unit_price', required: false, type: 'number' },
      { name: 'payment_method', required: false, type: 'string' },
    ],
  }
  return fields[importType] || []
}

// Preview import - validate without saving
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

  // Preview first 100 rows
  const previewLimit = Math.min(parsedCSV.rows.length, 100)

  for (let i = 0; i < previewLimit; i++) {
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
    previewRows: previewLimit,
    errors: errors.slice(0, 50), // Limit errors shown
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
      .select('id, sku')
      .eq('store_id', storeId)

    const productMap = new Map((existingProducts || []).map((p: { sku: string; id: string }) => [p.sku.toLowerCase(), p.id]))

    // Process in batches
    const batchSize = 100
    for (let i = 0; i < parsedCSV.rows.length; i += batchSize) {
      const batch = parsedCSV.rows.slice(i, i + batchSize)

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j]
        const rowNumber = i + j + 1

        try {
          // Transform row data
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
            // Process product
            if (!data.sku) continue

            const sku = String(data.sku).toLowerCase()
            const existingId = productMap.get(sku)

            // Get or create category
            let categoryId = null
            if (data.category) {
              const catName = String(data.category).toLowerCase()
              categoryId = categoryMap.get(catName)

              if (!categoryId) {
                // Create new category
                const { data: newCat } = await (serviceClient
                  .from('product_categories') as any)
                  .insert({ store_id: storeId, name: String(data.category) })
                  .select('id')
                  .single()

                if (newCat) {
                  categoryId = (newCat as { id: string }).id
                  categoryMap.set(catName, categoryId)
                }
              }
            }

            const productData = {
              store_id: storeId,
              sku: String(data.sku),
              name: String(data.name),
              description: data.description || null,
              category_id: categoryId,
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
            }

            if (existingId) {
              await (serviceClient.from('products') as any).update(productData).eq('id', existingId)
            } else {
              const { data: newProduct } = await (serviceClient.from('products') as any).insert(productData).select('id').single()
              if (newProduct) {
                productMap.set(sku, (newProduct as { id: string }).id)

                // Create inventory snapshot if stock provided
                if (data.stock) {
                  await (serviceClient.from('inventory_snapshots') as any).insert({
                    store_id: storeId,
                    product_id: (newProduct as { id: string }).id,
                    quantity: Number(data.stock),
                    snapshot_date: new Date().toISOString().split('T')[0],
                    notes: 'Imported from CSV',
                  })
                }
              }
            }
            successfulRows++
          } else if (importType === 'sales' || isSalesRow) {
            // Process sales - simplified for now
            // TODO: Group by receipt number and create receipts + line items
            successfulRows++
          }
        } catch (err) {
          failedRows++
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          errorLog.push({
            rowNumber,
            field: 'general',
            value: JSON.stringify(row).slice(0, 200),
            message: errorMsg,
          })

          // Log row error
          await (serviceClient.from('import_row_details') as any).insert({
            import_id: importId,
            row_number: rowNumber,
            row_data: row,
            status: 'error',
            error_message: errorMsg,
          })
        }
      }

      processedRows += batch.length
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
