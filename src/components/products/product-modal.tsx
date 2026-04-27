'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createProduct, updateProduct, getProductCategories, type ProductInput } from '@/app/actions/products';

interface ProductCategory {
  id: string;
  name: string;
  color?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  barcode?: string | null;
  cost_price?: number | null;
  selling_price: number;
  tax_rate?: number | null;
  min_stock_level?: number | null;
  max_stock_level?: number | null;
  reorder_point?: number | null;
  reorder_quantity?: number | null;
  unit_of_measure?: string | null;
  supplier_name?: string | null;
  supplier_contact?: string | null;
  is_active: boolean;
  product_categories?: { id: string; name: string } | null;
}

interface ProductModalProps {
  storeId: string;
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProductModal({ storeId, product, isOpen, onClose, onSuccess }: ProductModalProps) {
  const isEditing = !!product;
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ProductInput>({
    sku: '',
    name: '',
    description: '',
    categoryId: null,
    barcode: '',
    costPrice: null,
    sellingPrice: 0,
    taxRate: null,
    minStockLevel: null,
    maxStockLevel: null,
    reorderPoint: null,
    reorderQuantity: null,
    unitOfMeasure: 'unit',
    supplierName: '',
    supplierContact: '',
    isActive: true,
  });

  // Load categories and pre-fill form when editing
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        setFormData({
          sku: product.sku,
          name: product.name,
          description: product.description || '',
          categoryId: product.category_id || null,
          barcode: product.barcode || '',
          costPrice: product.cost_price || null,
          sellingPrice: product.selling_price,
          taxRate: product.tax_rate || null,
          minStockLevel: product.min_stock_level || null,
          maxStockLevel: product.max_stock_level || null,
          reorderPoint: product.reorder_point || null,
          reorderQuantity: product.reorder_quantity || null,
          unitOfMeasure: product.unit_of_measure || 'unit',
          supplierName: product.supplier_name || '',
          supplierContact: product.supplier_contact || '',
          isActive: product.is_active,
        });
      } else {
        // Reset form for new product
        setFormData({
          sku: '',
          name: '',
          description: '',
          categoryId: null,
          barcode: '',
          costPrice: null,
          sellingPrice: 0,
          taxRate: null,
          minStockLevel: null,
          maxStockLevel: null,
          reorderPoint: null,
          reorderQuantity: null,
          unitOfMeasure: 'unit',
          supplierName: '',
          supplierContact: '',
          isActive: true,
        });
      }
      setError(null);
      setActiveTab('basic');
    }
  }, [isOpen, product]);

  async function loadCategories() {
    setIsLoadingCategories(true);
    try {
      const data = await getProductCategories(storeId);
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  }

  function handleInputChange(field: keyof ProductInput, value: unknown) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function handleNumberInput(field: keyof ProductInput, value: string) {
    const numValue = value === '' ? null : parseFloat(value);
    handleInputChange(field, numValue);
  }

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);

    try {
      // Sanitize form data: convert empty strings to null
      const sanitizedData = {
        ...formData,
        description: formData.description || null,
        barcode: formData.barcode || null,
        supplierName: formData.supplierName || null,
        supplierContact: formData.supplierContact || null,
        unitOfMeasure: formData.unitOfMeasure || null,
      };

      const result = isEditing
        ? await updateProduct(product!.id, sanitizedData)
        : await createProduct(storeId, sanitizedData);

      if (result.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(result.error || 'An error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the product details below.'
              : 'Fill in the details to create a new product.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="supplier">Supplier</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder="e.g., PROD-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode || ''}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="e.g., 123456789012"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId || 'none'}
                onValueChange={(value) => handleInputChange('categoryId', value === 'none' ? null : value)}
                disabled={isLoadingCategories}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Product is active
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">
                  Selling Price <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sellingPrice || ''}
                  onChange={(e) => handleNumberInput('sellingPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice || ''}
                  onChange={(e) => handleNumberInput('costPrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taxRate || ''}
                  onChange={(e) => handleNumberInput('taxRate', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                <Input
                  id="unitOfMeasure"
                  value={formData.unitOfMeasure || ''}
                  onChange={(e) => handleInputChange('unitOfMeasure', e.target.value)}
                  placeholder="e.g., unit, kg, liter"
                />
              </div>
            </div>

            {formData.costPrice && formData.sellingPrice && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-lg font-semibold">
                  {((formData.sellingPrice - formData.costPrice) / formData.sellingPrice * 100).toFixed(2)}%
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  min="0"
                  value={formData.minStockLevel || ''}
                  onChange={(e) => handleNumberInput('minStockLevel', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStockLevel">Max Stock Level</Label>
                <Input
                  id="maxStockLevel"
                  type="number"
                  min="0"
                  value={formData.maxStockLevel || ''}
                  onChange={(e) => handleNumberInput('maxStockLevel', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reorderPoint">Reorder Point</Label>
                <Input
                  id="reorderPoint"
                  type="number"
                  min="0"
                  value={formData.reorderPoint || ''}
                  onChange={(e) => handleNumberInput('reorderPoint', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
                <Input
                  id="reorderQuantity"
                  type="number"
                  min="0"
                  value={formData.reorderQuantity || ''}
                  onChange={(e) => handleNumberInput('reorderQuantity', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              <p>Set inventory thresholds to receive low stock alerts.</p>
            </div>
          </TabsContent>

          <TabsContent value="supplier" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Input
                id="supplierName"
                value={formData.supplierName || ''}
                onChange={(e) => handleInputChange('supplierName', e.target.value)}
                placeholder="Enter supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierContact">Supplier Contact</Label>
              <Input
                id="supplierContact"
                value={formData.supplierContact || ''}
                onChange={(e) => handleInputChange('supplierContact', e.target.value)}
                placeholder="Email or phone number"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
