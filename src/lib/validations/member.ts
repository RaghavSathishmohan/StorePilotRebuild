import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'manager', 'staff'], {
    required_error: 'Please select a role',
  }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'staff'], {
    required_error: 'Please select a role',
  }),
});

export const removeMemberSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
