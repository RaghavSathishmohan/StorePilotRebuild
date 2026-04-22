import { Page, expect } from '@playwright/test'

export async function uploadCSVFile(page: Page, csvContent: string, filename: string = 'test-import.csv') {
  // Navigate to imports page
  await page.goto('/dashboard/imports')

  // Create a file from the CSV content
  const fileInput = await page.locator('input[type="file"]')

  // Create a File object with the CSV content
  await fileInput.evaluate((input: HTMLInputElement, { content, name }) => {
    const blob = new Blob([content], { type: 'text/csv' })
    const file = new File([blob], name, { type: 'text/csv' })
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, { content: csvContent, name: filename })

  // Wait for upload to complete and column mapping to appear
  await page.waitForSelector('text=Map CSV Columns', { timeout: 10000 })
}

export async function verifyColumnMapping(page: Page, expectedMappings: { csvColumn: string; dbField: string }[]) {
  for (const mapping of expectedMappings) {
    const cell = await page.locator(`text=${mapping.csvColumn}`).first()
    await expect(cell).toBeVisible()
  }
}

export async function proceedToPreview(page: Page) {
  await page.click('button:has-text("Preview Import")')
  await page.waitForSelector('text=Preview & Import', { timeout: 10000 })
}

export async function completeImport(page: Page) {
  await page.click('button:has-text("Import")')
  await page.waitForSelector('text=Import Complete!', { timeout: 30000 })
}

export async function downloadTemplate(page: Page) {
  await page.goto('/dashboard/imports')

  // Wait for download button and click
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download Template")'),
  ])

  return download
}

export async function verifyImportHistory(page: Page, expectedStatus: 'completed' | 'partial' | 'failed') {
  await page.goto('/dashboard/imports')

  // Check for import history table
  await page.waitForSelector('[data-testid="import-history"]')

  // Look for the status badge
  const statusBadge = await page.locator(`text=${expectedStatus}`).first()
  await expect(statusBadge).toBeVisible()
}
