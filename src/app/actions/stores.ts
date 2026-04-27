'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createStoreSchema, updateStoreSchema, createLocationSchema, updateLocationSchema, storeSettingsSchema } from '@/lib/validations/store';
import type { CreateStoreInput, UpdateStoreInput, CreateLocationInput, UpdateLocationInput, StoreSettingsInput } from '@/lib/validations/store';
import type { ActionResponse } from './auth';

// ============================================
// STORE ACTIONS
// ============================================

export async function createStore(formData: CreateStoreInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validated = createStoreSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Check if slug is unique
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', validated.data.slug)
    .single();

  if (existingStore) {
    return { success: false, error: 'A store with this slug already exists' };
  }

  // Create the store
  const { data: store, error } = await (supabase as any)
    .from('stores')
    .insert({
      name: validated.data.name,
      slug: validated.data.slug,
      owner_id: user.id,
      description: validated.data.description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating store:', error);
    return { success: false, error: `Failed to create store: ${error.message}` };
  }

  const typedStore = store as { id: string } | null

  // Update user's default store
  if (typedStore) {
    await (supabase as any)
      .from('profiles')
      .update({ default_store_id: typedStore.id })
      .eq('id', user.id);
  }

  revalidatePath('/dashboard/stores');
  return { success: true, data: store };
}

interface StoreWithLocations {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  store_members?: { role: string }[];
  store_locations?: { count: number };
}

export async function getStores(): Promise<StoreWithLocations[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // First get stores the user has access to
  const { data: stores, error } = await supabase
    .from('stores')
    .select(`
      *,
      store_members!inner(role)
    `)
    .eq('store_members.user_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }

  const typedStores = stores as StoreWithLocations[] | null

  // Get location counts separately for each store
  const storeIds = typedStores?.map(s => s.id) || [];
  if (storeIds.length > 0) {
    const { data: locations } = await supabase
      .from('store_locations')
      .select('store_id, id')
      .in('store_id', storeIds)
      .eq('status', 'active');

    const typedLocations = locations as { store_id: string; id: string }[] | null

    // Count locations per store
    const locationCounts = typedLocations?.reduce((acc, loc) => {
      acc[loc.store_id] = (acc[loc.store_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Attach counts to stores
    typedStores?.forEach(store => {
      store.store_locations = { count: locationCounts[store.id] || 0 };
    });
  }

  return typedStores || [];
}

export async function getStoreById(storeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch the store first (owners can access via RLS)
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select(`
      *,
      store_locations(*)
    `)
    .eq('id', storeId)
    .single();

  if (storeError) {
    console.error('Error fetching store:', storeError.message || storeError);
    return null;
  }

  const typedStore = store as { id: string; name: string; slug: string; owner_id: string; description: string | null; status: 'active' | 'inactive'; created_at: string; updated_at: string } | null

  // Check if user is owner
  const isOwner = typedStore?.owner_id === user.id;

  // Check membership separately
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .maybeSingle();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  // User must be either owner OR member
  if (!isOwner && !typedMembership) {
    console.error('User is not authorized to access this store');
    return null;
  }

  // Determine role (owner takes precedence)
  const role = isOwner ? 'owner' : typedMembership?.role;

  // Fetch locations separately
  const { data: locations } = await supabase
    .from('store_locations')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'active');

  if (!typedStore) {
    return null;
  }

  return {
    ...typedStore,
    store_locations: locations || [],
    store_members: [{ role }]
  };
}

export async function updateStore(storeId: string, formData: UpdateStoreInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validated = updateStoreSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Check permissions - only owner or admin can update
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

  const { data: store, error } = await (supabase as any)
    .from('stores')
    .update(validated.data)
    .eq('id', storeId)
    .select()
    .single();

  if (error) {
    console.error('Error updating store:', error);
    return { success: false, error: 'Failed to update store' };
  }

  revalidatePath(`/dashboard/stores/${storeId}`);
  return { success: true, data: store };
}

export async function deleteStore(storeId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only owner can delete
  const { data: store } = await supabase
    .from('stores')
    .select('owner_id')
    .eq('id', storeId)
    .single();

  const typedStore = store as { owner_id: string } | null

  if (!typedStore || typedStore.owner_id !== user.id) {
    return { success: false, error: 'Only the owner can delete a store' };
  }

  const { error } = await (supabase as any)
    .from('stores')
    .update({ status: 'inactive' })
    .eq('id', storeId);

  if (error) {
    console.error('Error deleting store:', error);
    return { success: false, error: 'Failed to delete store' };
  }

  revalidatePath('/dashboard/stores');
  return { success: true, data: { message: 'Store deleted successfully' } };
}

// ============================================
// LOCATION ACTIONS
// ============================================

export async function createLocation(storeId: string, formData: CreateLocationInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validated = createLocationSchema.safeParse(formData);
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

  const { data: location, error } = await (supabase as any)
    .from('store_locations')
    .insert({
      store_id: storeId,
      name: validated.data.name,
      code: validated.data.code.toUpperCase(),
      phone: validated.data.phone,
      email: validated.data.email,
      address_line_1: validated.data.addressLine1,
      address_line_2: validated.data.addressLine2,
      city: validated.data.city,
      state: validated.data.state,
      postal_code: validated.data.postalCode,
      country: validated.data.country,
      timezone: validated.data.timezone,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating location:', error);
    return { success: false, error: 'Failed to create location' };
  }

  revalidatePath(`/dashboard/stores/${storeId}/locations`);
  return { success: true, data: location };
}

interface Location {
  id: string;
  store_id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  hours_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function getLocations(storeId: string): Promise<Location[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check membership
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single();

  if (!membership) return [];

  const { data: locations, error } = await supabase
    .from('store_locations')
    .select('*')
    .eq('store_id', storeId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching locations:', error);
    return [];
  }

  return locations || [];
}

export async function getLocationById(locationId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: location, error } = await supabase
    .from('store_locations')
    .select('*, stores!inner(*)')
    .eq('id', locationId)
    .single();

  if (error) {
    console.error('Error fetching location:', error);
    return null;
  }

  return location;
}

export async function updateLocation(locationId: string, formData: UpdateLocationInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get location to find store_id
  const { data: location } = await supabase
    .from('store_locations')
    .select('store_id')
    .eq('id', locationId)
    .single();

  const typedLocation = location as { store_id: string } | null

  if (!typedLocation) {
    return { success: false, error: 'Location not found' };
  }

  // Check permissions
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', typedLocation.store_id)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMembership || (typedMembership.role !== 'owner' && typedMembership.role !== 'admin')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validated = updateLocationSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const { data: updatedLocation, error } = await (supabase as any)
    .from('store_locations')
    .update({
      name: validated.data.name,
      code: validated.data.code?.toUpperCase(),
      phone: validated.data.phone,
      email: validated.data.email,
      address_line_1: validated.data.addressLine1,
      address_line_2: validated.data.addressLine2,
      city: validated.data.city,
      state: validated.data.state,
      postal_code: validated.data.postalCode,
      country: validated.data.country,
      timezone: validated.data.timezone,
    })
    .eq('id', locationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating location:', error);
    return { success: false, error: 'Failed to update location' };
  }

  revalidatePath(`/dashboard/stores/${typedLocation.store_id}/locations`);
  return { success: true, data: updatedLocation };
}

export async function deleteLocation(locationId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get location
  const { data: location } = await supabase
    .from('store_locations')
    .select('store_id')
    .eq('id', locationId)
    .single();

  const typedLocation = location as { store_id: string } | null

  if (!typedLocation) {
    return { success: false, error: 'Location not found' };
  }

  // Only owner can delete locations
  const { data: store } = await supabase
    .from('stores')
    .select('owner_id')
    .eq('id', typedLocation.store_id)
    .single();

  const typedStore = store as { owner_id: string } | null

  if (!typedStore || typedStore.owner_id !== user.id) {
    return { success: false, error: 'Only the owner can delete locations' };
  }

  const { error } = await (supabase as any)
    .from('store_locations')
    .update({ status: 'inactive' })
    .eq('id', locationId);

  if (error) {
    console.error('Error deleting location:', error);
    return { success: false, error: 'Failed to delete location' };
  }

  revalidatePath(`/dashboard/stores/${typedLocation.store_id}/locations`);
  return { success: true, data: { message: 'Location deleted successfully' } };
}

// ============================================
// STORE SETTINGS ACTIONS
// ============================================

interface StoreSettings {
  id: string;
  store_id: string;
  currency: string;
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  low_stock_threshold: number;
  receipt_footer: string | null;
  created_at: string;
  updated_at: string;
}

export async function getStoreSettings(storeId: string): Promise<StoreSettings | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: settings, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (error) {
    console.error('Error fetching store settings:', error);
    return null;
  }

  return settings;
}

export async function updateStoreSettings(storeId: string, formData: StoreSettingsInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const validated = storeSettingsSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Check permissions
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

  const { data: settings, error } = await (supabase as any)
    .from('store_settings')
    .update({
      currency: validated.data.currency,
      timezone: validated.data.timezone,
      date_format: validated.data.dateFormat,
      low_stock_threshold: validated.data.lowStockThreshold,
      receipt_footer: validated.data.receiptFooter,
    })
    .eq('store_id', storeId)
    .select()
    .single();

  if (error) {
    console.error('Error updating store settings:', error);
    return { success: false, error: 'Failed to update settings' };
  }

  revalidatePath(`/dashboard/stores/${storeId}/settings`);
  return { success: true, data: settings };
}