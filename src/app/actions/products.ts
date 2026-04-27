'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { ActionResponse } from './auth';

// ============================================
// PRODUCT VALIDATION SCHEMAS
// ============================================

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU must be less than 100 characters'),
  name: z.string().min(1, 'Product name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  costPrice: z.number().min(0).optional().nullable(),
  sellingPrice: z.number().min(0, 'Selling price must be a positive number'),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  minStockLevel: z.number().int().min(0).optional().nullable(),
  maxStockLevel: z.number().int().min(0).optional().nullable(),
  reorderPoint: z.number().int().min(0).optional().nullable(),
  reorderQuantity: z.number().int().min(0).optional().nullable(),
  unitOfMeasure: z.string().max(50).optional().nullable(),
  supplierName: z.string().max(255).optional().nullable(),
  supplierContact: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
});

const createProductSchema = productSchema;
const updateProductSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ============================================
// PRODUCT ACTIONS
// ============================================

export async function createProduct(storeId: string, formData: CreateProductInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check permissions - admin or higher required
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMembership || (typedMembership.role !== 'owner' && typedMembership.role !== 'admin' && typedMembership.role !== 'manager')) {
    return { success: false, error: 'Insufficient permissions to create products' };
  }

  const validated = createProductSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Check if SKU already exists in this store
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .eq('sku', validated.data.sku)
    .single();

  if (existingProduct) {
    return { success: false, error: `A product with SKU "${validated.data.sku}" already exists in this store` };
  }

  const { data: product, error } = await (supabase as any)
    .from('products')
    .insert({
      store_id: storeId,
      sku: validated.data.sku,
      name: validated.data.name,
      description: validated.data.description,
      category_id: validated.data.categoryId,
      barcode: validated.data.barcode,
      cost_price: validated.data.costPrice,
      selling_price: validated.data.sellingPrice,
      tax_rate: validated.data.taxRate,
      min_stock_level: validated.data.minStockLevel,
      max_stock_level: validated.data.maxStockLevel,
      reorder_point: validated.data.reorderPoint,
      reorder_quantity: validated.data.reorderQuantity,
      unit_of_measure: validated.data.unitOfMeasure,
      supplier_name: validated.data.supplierName,
      supplier_contact: validated.data.supplierContact,
      is_active: validated.data.isActive,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating product:', error);
    return { success: false, error: `Failed to create product: ${error.message}` };
  }

  revalidatePath(`/dashboard/products`);
  return { success: true, data: product };
}

export async function updateProduct(productId: string, formData: UpdateProductInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get product to find store_id
  const { data: product } = await supabase
    .from('products')
    .select('store_id, sku')
    .eq('id', productId)
    .single();

  const typedProduct = product as { store_id: string; sku: string } | null

  if (!typedProduct) {
    return { success: false, error: 'Product not found' };
  }

  // Check permissions
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', typedProduct.store_id)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMembership || (typedMembership.role !== 'owner' && typedMembership.role !== 'admin' && typedMembership.role !== 'manager')) {
    return { success: false, error: 'Insufficient permissions to update products' };
  }

  const validated = updateProductSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // If SKU is being changed, check it doesn't conflict with another product
  if (validated.data.sku && validated.data.sku !== typedProduct.sku) {
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('store_id', typedProduct.store_id)
      .eq('sku', validated.data.sku)
      .single();

    if (existingProduct) {
      return { success: false, error: `A product with SKU "${validated.data.sku}" already exists in this store` };
    }
  }

  // Build update object with snake_case keys
  const updateData: Record<string, unknown> = {};
  if (validated.data.sku !== undefined) updateData.sku = validated.data.sku;
  if (validated.data.name !== undefined) updateData.name = validated.data.name;
  if (validated.data.description !== undefined) updateData.description = validated.data.description;
  if (validated.data.categoryId !== undefined) updateData.category_id = validated.data.categoryId;
  if (validated.data.barcode !== undefined) updateData.barcode = validated.data.barcode;
  if (validated.data.costPrice !== undefined) updateData.cost_price = validated.data.costPrice;
  if (validated.data.sellingPrice !== undefined) updateData.selling_price = validated.data.sellingPrice;
  if (validated.data.taxRate !== undefined) updateData.tax_rate = validated.data.taxRate;
  if (validated.data.minStockLevel !== undefined) updateData.min_stock_level = validated.data.minStockLevel;
  if (validated.data.maxStockLevel !== undefined) updateData.max_stock_level = validated.data.maxStockLevel;
  if (validated.data.reorderPoint !== undefined) updateData.reorder_point = validated.data.reorderPoint;
  if (validated.data.reorderQuantity !== undefined) updateData.reorder_quantity = validated.data.reorderQuantity;
  if (validated.data.unitOfMeasure !== undefined) updateData.unit_of_measure = validated.data.unitOfMeasure;
  if (validated.data.supplierName !== undefined) updateData.supplier_name = validated.data.supplierName;
  if (validated.data.supplierContact !== undefined) updateData.supplier_contact = validated.data.supplierContact;
  if (validated.data.isActive !== undefined) updateData.is_active = validated.data.isActive;

  const { data: updatedProduct, error } = await (supabase as any)
    .from('products')
    .update(updateData)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('Error updating product:', error);
    return { success: false, error: `Failed to update product: ${error.message}` };
  }

  revalidatePath(`/dashboard/products`);
  return { success: true, data: updatedProduct };
}

export async function deleteProduct(productId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get product to find store_id
  const { data: product } = await supabase
    .from('products')
    .select('store_id')
    .eq('id', productId)
    .single();

  const typedProduct = product as { store_id: string } | null

  if (!typedProduct) {
    return { success: false, error: 'Product not found' };
  }

  // Check permissions - only owner or admin can delete
  const { data: membership } = await supabase
    .from('store_members')
    .select('role')
    .eq('store_id', typedProduct.store_id)
    .eq('user_id', user.id)
    .single();

  const typedMembership = membership as { role: 'owner' | 'admin' | 'manager' | 'staff' } | null

  if (!typedMembership || (typedMembership.role !== 'owner' && typedMembership.role !== 'admin')) {
    return { success: false, error: 'Only owners and admins can delete products' };
  }

  // Soft delete by setting is_active to false
  const { error } = await (supabase as any)
    .from('products')
    .update({ is_active: false })
    .eq('id', productId);

  if (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }

  revalidatePath(`/dashboard/products`);
  return { success: true, data: { message: 'Product deleted successfully' } };
}

export async function getProducts(storeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories(id, name)
    `)
    .eq('store_id', storeId)
    .order('name');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return products || [];
}

export async function getProductById(productId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories(id, name)
    `)
    .eq('id', productId)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return product;
}

// ============================================
// PRODUCT CATEGORY ACTIONS
// ============================================

export async function getProductCategories(storeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: categories, error } = await supabase
    .from('product_categories')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return categories || [];
}

export async function createProductCategory(storeId: string, name: string, description?: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
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

  const { data: category, error } = await (supabase as any)
    .from('product_categories')
    .insert({
      store_id: storeId,
      name,
      description,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return { success: false, error: 'Failed to create category' };
  }

  return { success: true, data: category };
}
