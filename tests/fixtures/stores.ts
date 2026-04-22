// Test store fixtures
export const TEST_STORE = {
  name: 'Test Convenience Store',
  slug: `test-store-${Date.now()}`,
  description: 'A test store for e2e testing',
}

export const TEST_LOCATION = {
  name: 'Main Floor',
  code: 'MF001',
  address: '123 Test Street',
  city: 'Test City',
  state: 'CA',
  postalCode: '90210',
  phone: '555-0123',
}

export const TEST_CATEGORIES = [
  'Beverages',
  'Snacks',
  'Tobacco',
  'Household',
  'Dairy',
]
