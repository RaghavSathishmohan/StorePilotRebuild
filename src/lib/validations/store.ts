import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100, 'Store name must be less than 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createLocationSchema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(1, 'Location code is required')
    .max(20, 'Code must be less than 20 characters')
    .regex(/^[A-Z0-9-]+$/, 'Code can only contain uppercase letters, numbers, and hyphens'),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('US'),
  timezone: z.string().default('America/New_York'),
});

export const updateLocationSchema = createLocationSchema.partial();

export const storeSettingsSchema = z.object({
  currency: z.string().default('USD'),
  timezone: z.string().default('America/New_York'),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
  lowStockThreshold: z.number().int().min(1).default(10),
  receiptFooter: z.string().max(500).optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
