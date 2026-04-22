import { Page } from '@playwright/test'
import { TEST_USERS } from '../fixtures/users'

export async function login(page: Page, role: 'owner' | 'admin' | 'manager' | 'staff' = 'owner') {
  const user = TEST_USERS[role]

  await page.goto('/login')
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 })
}

export async function signup(page: Page, email: string, password: string, fullName: string) {
  await page.goto('/signup')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="fullName"]', fullName)
  await page.click('button[type="submit"]')

  // Wait for onboarding or dashboard
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10000 })
}

export async function logout(page: Page) {
  await page.goto('/logout')
  await page.waitForURL('/login', { timeout: 10000 })
}

export async function createTestStore(page: Page, storeName: string) {
  await page.goto('/dashboard/stores/new')
  await page.fill('input[name="name"]', storeName)
  await page.fill('input[name="slug"]', storeName.toLowerCase().replace(/\s+/g, '-'))
  await page.click('button[type="submit"]')

  // Wait for store creation
  await page.waitForURL(/\/dashboard\/stores\/[a-f0-9-]+/, { timeout: 10000 })
}

export async function switchStore(page: Page, storeName: string) {
  // Click on store selector
  await page.click('[data-testid="store-selector"]')
  await page.click(`text=${storeName}`)
  await page.waitForTimeout(500)
}
