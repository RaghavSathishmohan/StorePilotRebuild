import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().optional(),
  timezone: z.string().default('America/New_York'),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  sidebarCollapsed: z.boolean().default(false),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
