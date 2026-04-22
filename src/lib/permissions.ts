import { createServerSupabaseClient, createServiceClient } from './supabase/admin';

export async function checkStorePermission(
  storeId: string,
  userId: string,
  requiredRole: 'owner' | 'admin' | 'manager' | 'staff' = 'staff'
): Promise<{ allowed: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  // Check if user is owner
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('owner_id', userId)
    .single();

  if (store) {
    return { allowed: true };
  }

  // Check membership role
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!membership) {
    return { allowed: false, error: 'You are not a member of this store' };
  }

  const roleHierarchy = { owner: 4, admin: 3, manager: 2, staff: 1 };
  const userRoleLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredLevel) {
    return { allowed: false, error: `Requires ${requiredRole} role or higher` };
  }

  return { allowed: true };
}
