'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/components/dashboard/store-provider'
import { ProductModal } from '@/components/products/product-modal'
import { Package, Plus, Search, Edit, Trash2, Download, Loader2 } from 'lucide-react'
import { getProducts, deleteProduct } from '@/app/actions/products'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Product {
  id: string
  sku: string
  name: string
  description?: string | null
  category_id?: string | null
  barcode?: string | null
  cost_price?: number | null
  selling_price: number
  tax_rate?: number | null
  min_stock_level?: number | null
  max_stock_level?: number | null
  reorder_point?: number | null
  reorder_quantity?: number | null
  unit_of_measure?: string | null
  supplier_name?: string | null
  supplier_contact?: string | null
  is_active: boolean
  product_categories?: { id: string; name: string } | null
}

export default function ProductsPage() {
  const { selectedStore } = useStore()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const loadProducts = useCallback(async () => {
    if (!selectedStore) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await getProducts(selectedStore.id)
      setProducts(data)
    } catch (err) {
      console.error('Error loading products:', err)
      setError('Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }, [selectedStore])

  useEffect(() => {
    if (selectedStore) {
      loadProducts()
    }
  }, [selectedStore, loadProducts])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return

    setIsLoadingAction(true)
    try {
      const result = await deleteProduct(productToDelete.id)
      if (result.success) {
        await loadProducts()
        setIsDeleteDialogOpen(false)
        setProductToDelete(null)
      } else {
        setError(result.error || 'Failed to delete product')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsLoadingAction(false)
    }
  }

  const downloadCSV = () => {
    const headers = ['sku', 'name', 'description', 'category', 'barcode', 'selling_price', 'cost_price', 'tax_rate', 'min_stock_level', 'max_stock_level', 'reorder_point', 'reorder_quantity', 'unit_of_measure', 'supplier_name', 'supplier_contact', 'is_active']

    const rows = products.map(p => [
      p.sku,
      p.name,
      p.description || '',
      p.product_categories?.name || '',
      p.barcode || '',
      p.selling_price,
      p.cost_price || '',
      p.tax_rate || '',
      p.min_stock_level || '',
      p.max_stock_level || '',
      p.reorder_point || '',
      p.reorder_quantity || '',
      p.unit_of_measure || '',
      p.supplier_name || '',
      p.supplier_contact || '',
      p.is_active ? 'true' : 'false'
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-${selectedStore?.name || 'store'}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!selectedStore) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-2">Please select a store first.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog ({isLoading ? '...' : `${products.length} products`})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSV} disabled={products.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={handleAddProduct}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term.' : 'Get started by adding your first product.'}
              </p>
              {!searchQuery && (
                <Button onClick={handleAddProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-medium">
                        <div>
                          {product.name}
                          {product.barcode && (
                            <p className="text-xs text-muted-foreground">Barcode: {product.barcode}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.product_categories ? (
                          <Badge variant="secondary">{product.product_categories.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">${product.selling_price.toFixed(2)}</span>
                          {product.cost_price && (
                            <p className="text-xs text-muted-foreground">
                              Cost: ${product.cost_price.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(product)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Modal */}
      <ProductModal
        storeId={selectedStore.id}
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadProducts}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{productToDelete?.name}&quot;? This will mark the product as inactive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoadingAction}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isLoadingAction}>
              {isLoadingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
