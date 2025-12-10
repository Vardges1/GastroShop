-- Update manchego image
UPDATE products 
SET images = ARRAY['/images/манчего.png'] 
WHERE slug = 'manchego-curado';

-- Rename roquefort to dorblu
UPDATE products 
SET slug = 'dorblu',
    title = 'Дорблю',
    description = 'Немецкий голубой сыр с нежным сливочным вкусом и характерными голубыми прожилками плесени. Производится в Баварии по традиционному рецепту с использованием благородной плесени Penicillium roqueforti. Обладает мягким солоноватым вкусом с ореховыми нотами. Идеален для салатов, соусов и как самостоятельная закуска с медом и орехами.',
    region_code = 'DE',
    tags = ARRAY['blue', 'german', 'creamy', 'mild']
WHERE slug = 'roquefort';

-- Delete mozzarella and burrata
DELETE FROM products WHERE slug IN ('mozzarella-bufala', 'burrata-fresh');



























