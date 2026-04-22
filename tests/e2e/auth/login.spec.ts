import { test, expect } from '@playwright/test'
import { TEST_USERS } from '../../fixtures/users'

test.describe('Authentication Flows', () => {
  test('should login as owner and redirect to dashboard', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('input[type="email"]', TEST_USERS.owner.email)
    await page.fill('input[type="password"]', TEST_USERS.owner.password)
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // Should show dashboard content
    await expect(page.locator('text=Welcome')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible()
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard/stores')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})
