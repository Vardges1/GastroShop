-- Remove any products that have empty titles or are named "product" or similar generic names
DELETE FROM products 
WHERE title IS NULL 
   OR title = '' 
   OR LOWER(TRIM(title)) LIKE 'product%'
   OR title LIKE 'test-%'
   OR LENGTH(TRIM(title)) < 3;

-- Add a constraint to prevent empty titles in the future (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_title_not_empty'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_title_not_empty 
        CHECK (title IS NOT NULL AND LENGTH(TRIM(title)) >= 3);
    END IF;
END $$;

