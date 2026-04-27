'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { inviteMemberSchema, updateMemberRoleSchema } from '@/lib/validations/member';
import type { InviteMemberInput, UpdateMemberRoleInput } from '@/lib/validations/member';
import type { ActionResponse } from './auth';
import { randomBytes } from 'crypto';
import { sendInvitationEmail } from '@/lib/email';

interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  status: 'active' | 'pending';
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface Invitation {
  id: string;
  store_id: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  invited_by: string;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getStoreMembers(storeId: string): Promise<StoreMember[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: members, error } = await supabase
    .from('store_members')
    .select(`
      *,
      profiles:user_id(id, full_name, email, avatar_url)
    `)
    .eq('store_id', storeId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return (members || []) as StoreMember[];
}

export async function inviteMember(storeId: string, formData: InviteMemberInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validated = inviteMemberSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Check permissions - admin or higher
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMembership || (typedMembership.role !== 'owner' && typedMembership.role !== 'admin')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Get inviter profile and store name for the email
  const [{ data: inviterProfile }, { data: store }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('stores').select('name').eq('id', storeId).single(),
  ]);

  const typedInviterProfile = inviterProfile as { full_name: string | null } | null
  const typedStore = store as { name: string } | null

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', validated.data.email)
    .single();

  const typedExistingUser = existingUser as { id: string } | null

  if (typedExistingUser) {
    // Check if already a member
    const { data: existingMember } = await supabase
      .from('store_members')
      .select('id')
      .eq('store_id', storeId)
      .eq('user_id', typedExistingUser.id)
      .single();

    if (existingMember) {
      return { success: false, error: 'This user is already a member of this store' };
    }
  }

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('store_id', storeId)
    .eq('email', validated.data.email)
    .eq('status', 'pending')
    .single();

  if (existingInvitation) {
    return { success: false, error: 'An invitation is already pending for this email' };
  }

  // Generate invitation token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const { data: invitation, error } = await (supabase as any)
    .from('invitations')
    .insert({
      store_id: storeId,
      email: validated.data.email,
      role: validated.data.role,
      token,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    return { success: false, error: 'Failed to send invitation' };
  }

  // Send invitation email
  const emailResult = await sendInvitationEmail({
    to: validated.data.email,
    inviterName: typedInviterProfile?.full_name || 'Someone',
    storeName: typedStore?.name || 'a store',
    role: validated.data.role,
    token,
  });

  if (!emailResult.success) {
    console.error('Failed to send invitation email:', emailResult.error);
    // Return warning but invitation is still created
    revalidatePath(`/dashboard/stores/${storeId}/members`);
    return {
      success: true,
      data: invitation,
      warning: `Invitation created but email failed: ${emailResult.error}`,
    };
  }

  revalidatePath(`/dashboard/stores/${storeId}/members`);
  return { success: true, data: invitation };
}

interface InvitationWithProfile extends Invitation {
  invited_by_profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export async function getPendingInvitations(storeId: string): Promise<InvitationWithProfile[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: invitations, error } = await supabase
    .from('invitations')
    .select(`
      *,
      invited_by_profiles:invited_by(id, full_name, email)
    `)
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }

  return invitations || [];
}

export async function cancelInvitation(invitationId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get invitation to find store
  const { data: invitation } = await supabase
    .from('invitations')
    .select('store_id')
    .eq('id', invitationId)
    .single();

  const typedInvitation = invitation as { store_id: string } | null

  if (!typedInvitation) {
    return { success: false, error: 'Invitation not found' };
  }

  // Check permissions
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', typedInvitation.store_id)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMembership || (typedMembership.role !== 'owner' && typedMembership.role !== 'admin')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { error } = await (supabase as any)
    .from('invitations')
    .update({ status: 'expired' })
    .eq('id', invitationId);

  if (error) {
    console.error('Error canceling invitation:', error);
    return { success: false, error: 'Failed to cancel invitation' };
  }

  revalidatePath(`/dashboard/stores/${typedInvitation.store_id}/members`);
  return { success: true, data: { message: 'Invitation canceled' } };
}

export async function updateMemberRole(memberId: string, formData: UpdateMemberRoleInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validated = updateMemberRoleSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Get member to find store
  const { data: member } = await supabase
    .from('store_members')
    .select('store_id, user_id, role')
    .eq('id', memberId)
    .single();

  const typedMember = member as { store_id: string; user_id: string; role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMember) {
    return { success: false, error: 'Member not found' };
  }

  // Cannot modify owners
  if (typedMember.role === 'owner') {
    return { success: false, error: 'Cannot modify the owner\'s role' };
  }

  // Check permissions
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', typedMember.store_id)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  // Only owner can assign admin role
  if (validated.data.role === 'admin' && typedMembership?.role !== 'owner') {
    return { success: false, error: 'Only the owner can assign admin roles' };
  }

  // Admin can manage non-owners
  if (typedMembership?.role !== 'owner' && typedMembership?.role !== 'admin') {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { data: updatedMember, error } = await (supabase as any)
    .from('store_members')
    .update({ role: validated.data.role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: 'Failed to update role' };
  }

  revalidatePath(`/dashboard/stores/${typedMember.store_id}/members`);
  return { success: true, data: updatedMember };
}

export async function removeMember(memberId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get member to find store
  const { data: member } = await supabase
    .from('store_members')
    .select('store_id, user_id, role')
    .eq('id', memberId)
    .single();

  const typedMember = member as { store_id: string; user_id: string; role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMember) {
    return { success: false, error: 'Member not found' };
  }

  // Cannot remove owner
  if (typedMember.role === 'owner') {
    return { success: false, error: 'Cannot remove the store owner' };
  }

  // Check permissions
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', typedMember.store_id)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  // Cannot remove yourself
  if (typedMember.user_id === user.id) {
    return { success: false, error: 'You cannot remove yourself' };
  }

  // Admin cannot remove other admins
  if (typedMember.role === 'admin' && typedMembership?.role !== 'owner') {
    return { success: false, error: 'Only the owner can remove admins' };
  }

  // Admin+ can remove members
  if (typedMembership?.role !== 'owner' && typedMembership?.role !== 'admin') {
    return { success: false, error: 'Insufficient permissions' };
  }

  const { error } = await (supabase as any)
    .from('store_members')
    .update({ status: 'inactive' })
    .eq('id', memberId);

  if (error) {
    console.error('Error removing member:', error);
    return { success: false, error: 'Failed to remove member' };
  }

  revalidatePath(`/dashboard/stores/${typedMember.store_id}/members`);
  return { success: true, data: { message: 'Member removed successfully' } };
}

export async function acceptInvitation(token: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Get invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  const typedInvitation = invitation as { id: string; store_id: string; role: 'admin' | 'manager' | 'staff' } | null

  if (!typedInvitation) {
    return { success: false, error: 'Invalid or expired invitation' };
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('store_members')
    .select('id')
    .eq('store_id', typedInvitation.store_id)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    // Update invitation status
    await (supabase as any)
      .from('invitations')
      .update({ status: 'accepted', accepted_by: user.id })
      .eq('id', typedInvitation.id);

    redirect('/dashboard');
  }

  // Create membership
  const { error: memberError } = await (supabase as any)
    .from('store_members')
    .insert({
      store_id: typedInvitation.store_id,
      user_id: user.id,
      role: typedInvitation.role,
      status: 'active',
    });

  if (memberError) {
    console.error('Error creating membership:', memberError);
    return { success: false, error: 'Failed to join store' };
  }

  // Update invitation
  await (supabase as any)
    .from('invitations')
    .update({ status: 'accepted', accepted_by: user.id })
    .eq('id', typedInvitation.id);

  // Update user's default store
  await (supabase as any)
    .from('profiles')
    .update({ default_store_id: typedInvitation.store_id })
    .eq('id', user.id);

  redirect('/dashboard');
}