// Test user fixtures for different roles
export const TEST_USERS = {
  owner: {
    email: 'test-owner@storepilot.io',
    password: 'Test123!',
    role: 'owner',
  },
  admin: {
    email: 'test-admin@storepilot.io',
    password: 'Test123!',
    role: 'admin',
  },
  manager: {
    email: 'test-manager@storepilot.io',
    password: 'Test123!',
    role: 'manager',
  },
  staff: {
    email: 'test-staff@storepilot.io',
    password: 'Test123!',
    role: 'staff',
  },
}

// New user for signup tests
export const NEW_USER = {
  email: `test-new-${Date.now()}@storepilot.io`,
  password: 'Test123!',
  fullName: 'Test User',
}
