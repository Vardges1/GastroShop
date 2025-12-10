-- Add quantity column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Update existing products to have quantity = 10 if they are in stock
UPDATE products SET quantity = 10 WHERE in_stock = true AND (quantity IS NULL OR quantity = 0);

-- Create index for quantity
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);

