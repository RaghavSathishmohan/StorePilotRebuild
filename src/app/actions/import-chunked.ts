'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkStorePermission } from '@/lib/permissions'

/**
 * Process a chunk of CSV data for large file imports
 * This is optimized for speed with batch inserts
 */
export async function processImportChunk(
  storeId: string,
  importId: string,
  chunkData: {
    receipts: any[]
    lineItems: any[]
    products: { insert: any[]; update: { id: string; data: any }[] }
    categories: string[]
    inventorySnapshots: any[]
  },
  options: { isFirstChunk: boolean; isLastChunk: boolean }
) {
  const serviceClient = createServiceClient()
  const startTime = Date.now()

  try {
    // Get existing data for lookups
    const { data: existingCategories } = await serviceClient
      .from('product_categories')
      .select('id, name')
      .eq('store_id', storeId)

    const categoryMap = new Map<string, string>((existingCategories || []).map((c: { name: string; id: string }) => [c.name.toLowerCase(), c.id]))

    const { data: existingProducts } = await serviceClient
      .from('products')
      .select('id, sku, cost_price')
      .eq('store_id', storeId)

    const productMap = new Map<string, { id: string; cost_price: number | null }>((existingProducts || []).map((p: { sku: string; id: string; cost_price: number | null }) => [p.sku.toLowerCase(), { id: p.id, cost_price: p.cost_price }]))

    // For line items, resolve product IDs and cost prices
    const lineItemsWithProductData: any[] = []
    for (const receiptData of chunkData.receipts) {
      for (const item of receiptData.items) {
        const product = item.product_sku ? productMap.get(item.product_sku.toLowerCase()) : null
        lineItemsWithProductData.push({
          ...item,
          product_id: product?.id || null,
          cost_price: product?.cost_price || item.cost_price || 0,
        })
      }
    }

    // Create new categories
    const categoriesToCreate = chunkData.categories.filter(cat => !categoryMap.has(cat.toLowerCase()))
    if (categoriesToCreate.length > 0) {
      const newCategories = categoriesToCreate.map(name => ({
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
    for (const product of chunkData.products.insert) {
      if (product.category_name) {
        product.category_id = categoryMap.get(product.category_name.toLowerCase()) || null
      }
      delete product.category_name
    }

    for (const product of chunkData.products.update) {
      if (product.data.category_name) {
        product.data.category_id = categoryMap.get(product.data.category_name.toLowerCase()) || null
      }
      delete product.data.category_name
    }

    // Batch insert products
    if (chunkData.products.insert.length > 0) {
      const batchSize = 500
      for (let i = 0; i < chunkData.products.insert.length; i += batchSize) {
        const batch = chunkData.products.insert.slice(i, i + batchSize)
        const { data: inserted } = await (serviceClient
          .from('products') as any)
          .insert(batch)
          .select('id, sku')

        if (inserted) {
          for (const product of inserted) {
            productMap.set(product.sku.toLowerCase(), product.id)
          }
        }
      }
    }

    // Batch update products
    if (chunkData.products.update.length > 0) {
      const batchSize = 100
      for (let i = 0; i < chunkData.products.update.length; i += batchSize) {
        const batch = chunkData.products.update.slice(i, i + batchSize)
        await Promise.all(batch.map(({ id, data }) =>
          (serviceClient.from('products') as any).update(data).eq('id', id)
        ))
      }
    }

    // Batch insert receipts with calculated totals
    const receiptIdMap = new Map<string, string>()
    if (chunkData.receipts.length > 0) {
      const receiptsData = chunkData.receipts.map(receiptData => {
        const subtotal = receiptData.items.reduce((sum: number, item: any) =>
          sum + (item.unit_price * item.quantity), 0)
        const discountTotal = receiptData.items.reduce((sum: number, item: any) =>
          sum + item.discount_amount, 0)
        const taxTotal = receiptData.items.reduce((sum: number, item: any) =>
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

      const batchSize = 500
      for (let i = 0; i < receiptsData.length; i += batchSize) {
        const batch = receiptsData.slice(i, i + batchSize)
        const { data: inserted } = await (serviceClient
          .from('sales_receipts') as any)
          .insert(batch)
          .select('id, receipt_number')

        if (inserted) {
          for (const receipt of inserted) {
            receiptIdMap.set(receipt.receipt_number, receipt.id)
          }
        }
      }
    }

    // Prepare and batch insert line items
    const lineItemsWithReceiptIds: any[] = []
    let lineItemIndex = 0
    for (const receiptData of chunkData.receipts) {
      const receiptId = receiptIdMap.get(receiptData.receipt_number)
      if (receiptId) {
        for (const item of receiptData.items) {
          const productData = lineItemsWithProductData[lineItemIndex]
          lineItemsWithReceiptIds.push({
            receipt_id: receiptId,
            product_id: productData?.product_id,
            product_sku: item.product_sku,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            tax_amount: item.tax_amount,
            cost_price: productData?.cost_price || 0,
            total_amount: item.total_amount,
          })
          lineItemIndex++
        }
      }
    }

    // Batch insert line items
    if (lineItemsWithReceiptIds.length > 0) {
      const batchSize = 1000
      for (let i = 0; i < lineItemsWithReceiptIds.length; i += batchSize) {
        const batch = lineItemsWithReceiptIds.slice(i, i + batchSize)
        await (serviceClient.from('sale_line_items') as any).insert(batch)
      }
    }

    // Create inventory snapshots
    if (chunkData.inventorySnapshots.length > 0) {
      const snapshotsWithProductIds = chunkData.inventorySnapshots
        .map((s: any) => ({
          ...s,
          product_id: productMap.get(s.sku.toLowerCase()),
          store_id: storeId,
        }))
        .filter((s: any) => s.product_id)

      if (snapshotsWithProductIds.length > 0) {
        const batchSize = 500
        for (let i = 0; i < snapshotsWithProductIds.length; i += batchSize) {
          await (serviceClient.from('inventory_snapshots') as any)
            .insert(snapshotsWithProductIds.slice(i, i + batchSize))
        }
      }
    }

    const duration = Date.now() - startTime

    // Update import progress
    const { data: currentImport } = await (serviceClient.from('imports') as any)
      .select('processed_rows')
      .eq('id', importId)
      .single()

    const newProcessedRows = (currentImport?.processed_rows || 0) + chunkData.receipts.length + chunkData.products.insert.length + chunkData.products.update.length

    await (serviceClient.from('imports') as any)
      .update({
        processed_rows: newProcessedRows,
      })
      .eq('id', importId)

    return {
      success: true,
      processed: chunkData.receipts.length + chunkData.products.insert.length + chunkData.products.update.length,
      duration,
    }
  } catch (error) {
    console.error('Error processing chunk:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create import record for chunked processing
 */
export async function createChunkedImport(
  storeId: string,
  importType: string,
  fileName: string,
  fileSize: number,
  totalRows: number,
  columnMapping: { csvColumn: string; dbField: string; confidence?: string }[]
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const { allowed } = await checkStorePermission(storeId, user.id, 'admin')
  if (!allowed) {
    throw new Error('Only store admins can import data')
  }

  const fields = getFieldsForImportType(importType)
  const requiredFields = fields.filter(f => f.required).map(f => f.name)
  const mappedFields = columnMapping.map(m => m.dbField)
  const matchedRequired = requiredFields.filter(f => mappedFields.includes(f)).length
  const mappingAccuracy = requiredFields.length > 0 ? Math.round((matchedRequired / requiredFields.length) * 100) : 100

  const { data: importRecord, error } = await (supabase.from('imports') as any)
    .insert({
      store_id: storeId,
      import_type: importType,
      file_name: fileName,
      file_size_bytes: fileSize,
      file_format: 'csv',
      status: 'processing',
      total_rows: totalRows,
      mapping_config: columnMapping,
      mapping_accuracy: mappingAccuracy,
      column_mapping_details: columnMapping,
      initiated_by: user.id,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create import: ${error.message}`)
  }

  return { id: importRecord.id }
}

/**
 * Finalize chunked import
 */
export async function finalizeChunkedImport(
  importId: string,
  results: { processed: number; successful: number; failed: number; errorLog: any[] }
) {
  const serviceClient = createServiceClient()

  const finalStatus = results.failed === 0 ? 'completed' : results.successful > 0 ? 'partial' : 'failed'

  await (serviceClient.from('imports') as any)
    .update({
      status: finalStatus,
      processed_rows: results.processed,
      successful_rows: results.successful,
      failed_rows: results.failed,
      error_log: results.errorLog.slice(0, 100),
      completed_at: new Date().toISOString(),
    })
    .eq('id', importId)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/products')
  revalidatePath('/dashboard/analytics')

  return { success: true }
}

function getFieldsForImportType(importType: string): { name: string; required: boolean; type: string }[] {
  const fields: Record<string, { name: string; required: boolean; type: string }[]> = {
    products: [
      { name: 'sku', required: true, type: 'string' },
      { name: 'name', required: true, type: 'string' },
      { name: 'selling_price', required: true, type: 'number' },
    ],
    sales: [
      { name: 'receipt_number', required: true, type: 'string' },
      { name: 'transaction_date', required: true, type: 'datetime' },
      { name: 'quantity', required: true, type: 'integer' },
      { name: 'unit_price', required: true, type: 'number' },
    ],
    unified: [
      { name: 'sku', required: false, type: 'string' },
      { name: 'receipt_number', required: false, type: 'string' },
    ],
  }
  return fields[importType] || []
}
