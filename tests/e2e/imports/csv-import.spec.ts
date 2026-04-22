import { test, expect } from '@playwright/test'
import { login } from '../../helpers/auth'
import { uploadCSVFile, verifyColumnMapping, proceedToPreview, completeImport, verifyImportHistory } from '../../helpers/csv-upload'
import { VALID_PRODUCTS_CSV, INVALID_PRODUCTS_CSV, SYNONYM_COLUMNS_CSV, SPECIAL_CHARS_CSV } from '../../fixtures/csv-imports'

test.describe('CSV Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner')
  })

  test('should upload and preview products CSV', async ({ page }) => {
    // Upload CSV
    await uploadCSVFile(page, VALID_PRODUCTS_CSV)

    // Verify column mapping
    await verifyColumnMapping(page, [
      { csvColumn: 'sku', dbField: 'SKU' },
      { csvColumn: 'name', dbField: 'Product Name' },
      { csvColumn: 'selling_price', dbField: 'Selling Price' },
    ])

    // Proceed to preview
    await proceedToPreview(page)

    // Verify preview stats
    await expect(page.locator('text=Total Rows')).toBeVisible()
    await expect(page.locator('text=5')).toBeVisible() // 5 products
  })

  test('should complete product import successfully', async ({ page }) => {
    // Upload and import
    await uploadCSVFile(page, VALID_PRODUCTS_CSV, 'products-import.csv')
    await proceedToPreview(page)
    await completeImport(page)

    // Verify completion dialog
    await expect(page.locator('text=Import Complete!')).toBeVisible()
    await expect(page.locator('text=Successful')).toBeVisible()
  })

  test('should auto-map columns with synonyms', async ({ page }) => {
    // Upload CSV with synonym column names
    await uploadCSVFile(page, SYNONYM_COLUMNS_CSV, 'synonyms.csv')

    // Verify auto-mapping worked
    await expect(page.locator('text=product_code')).toBeVisible()
    await expect(page.locator('text=item_name')).toBeVisible()

    // Check that confidence indicators are shown
    await page.waitForSelector('[data-testid="mapping-confidence"]')
  })

  test('should handle CSV with special characters', async ({ page }) => {
    await uploadCSVFile(page, SPECIAL_CHARS_CSV, 'special-chars.csv')
    await proceedToPreview(page)

    // Should show valid rows without errors
    await expect(page.locator('text=Valid')).toBeVisible()
  })

  test('should show validation errors for invalid data', async ({ page }) => {
    await uploadCSVFile(page, INVALID_PRODUCTS_CSV, 'invalid.csv')
    await proceedToPreview(page)

    // Should show errors
    await expect(page.locator('text=Errors')).toBeVisible()
    await expect(page.locator('text=SKU is required')).toBeVisible()
    await expect(page.locator('text=Selling price is required')).toBeVisible()
  })

  test('should track import in history', async ({ page }) => {
    // Complete an import
    await uploadCSVFile(page, VALID_PRODUCTS_CSV, 'history-test.csv')
    await proceedToPreview(page)
    await completeImport(page)
    await page.click('button:has-text("Done")')

    // Verify in history
    await verifyImportHistory(page, 'completed')
  })

  test('should download template', async ({ page }) => {
    await page.goto('/dashboard/imports')

    // Click download template
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Template")'),
    ])

    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('should handle large CSV files', async ({ page }) => {
    // Generate a CSV with 50 rows
    const { generateLargeCSV } = await import('../../fixtures/csv-imports')
    const largeCSV = generateLargeCSV(50)

    await uploadCSVFile(page, largeCSV, 'large-import.csv')
    await proceedToPreview(page)

    // Should process successfully
    await expect(page.locator('text=50')).toBeVisible()
  })
})
