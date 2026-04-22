import { test, expect } from '@playwright/test'
import { login } from '../../helpers/auth'
import { TEST_STORE } from '../../fixtures/stores'

test.describe('Store Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner')
  })

  test('should create a new store', async ({ page }) => {
    // Navigate to create store page
    await page.goto('/dashboard/stores/new')

    // Fill store form
    const storeName = `Test Store ${Date.now()}`
    await page.fill('input[name="name"]', storeName)
    await page.fill('input[name="slug"]', storeName.toLowerCase().replace(/\s+/g, '-'))
    await page.fill('textarea[name="description"]', 'A test store for e2e testing')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to store detail page
    await page.waitForURL(/\/dashboard\/stores\/[a-f0-9-]+/, { timeout: 10000 })

    // Should show store name
    await expect(page.locator(`text=${storeName}`)).toBeVisible()
  })

  test('should show validation error for duplicate slug', async ({ page }) => {
    // Create first store
    await page.goto('/dashboard/stores/new')
    const storeName = `Duplicate Test ${Date.now()}`
    const slug = storeName.toLowerCase().replace(/\s+/g, '-')

    await page.fill('input[name="name"]', storeName)
    await page.fill('input[name="slug"]', slug)
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForURL(/\/dashboard\/stores\/[a-f0-9-]+/, { timeout: 10000 })

    // Try to create another with same slug
    await page.goto('/dashboard/stores/new')
    await page.fill('input[name="name"]', storeName + ' 2')
    await page.fill('input[name="slug"]', slug)
    await page.click('button[type="submit"]')

    // Should show error
    await expect(page.locator('text=already exists')).toBeVisible()
  })
})
