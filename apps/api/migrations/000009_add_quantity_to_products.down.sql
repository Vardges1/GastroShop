-- Remove quantity column from products table
DROP INDEX IF EXISTS idx_products_quantity;
ALTER TABLE products DROP COLUMN IF EXISTS quantity;



















