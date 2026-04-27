-- Add stock column to products table for simplified inventory tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Create index for stock queries
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(store_id, stock);

-- Add comment explaining usage
COMMENT ON COLUMN products.stock IS 'Current stock quantity - simplified inventory tracking without snapshots';
