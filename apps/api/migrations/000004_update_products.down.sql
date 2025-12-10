-- Revert manchego image
UPDATE products 
SET images = ARRAY['/images/grana.png'] 
WHERE slug = 'manchego-curado';

-- Revert dorblu to roquefort
UPDATE products 
SET slug = 'roquefort',
    title = 'Рокфор AOP',
    description = 'Французский голубой сыр из овечьего молока, созревающий в известковых пещерах Комбалу. Интенсивный пряный вкус с солоноватыми минеральными нотами. Сыр пронизан Blaueveinpenicillium roqueforti - благородной плесенью. Легенда гласит, что пастух забыл хлеб и сыр в пещере, обнаружив через месяц продукт с голубой плесенью. Идеален с медом и орехами.',
    region_code = 'FR',
    tags = ARRAY['blue', 'french', 'tangy', 'salty']
WHERE slug = 'dorblu';

-- Restore deleted products (this would need the original data)
-- Note: This is a placeholder - actual restoration would require original product data



























