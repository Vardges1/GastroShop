-- Update product tags to include proper category tags (cheese, ham, etc.)
-- This ensures filters work correctly with categories

-- Add 'cheese' tag to all cheese products
UPDATE products 
SET tags = tags || ARRAY['cheese'] 
WHERE (title ILIKE '%сыр%' OR title ILIKE '%cheese%' OR title ILIKE '%brie%' OR title ILIKE '%parmigiano%' OR title ILIKE '%pecorino%' OR title ILIKE '%gruyere%' OR title ILIKE '%comte%' OR title ILIKE '%camembert%' OR title ILIKE '%dorblu%' OR title ILIKE '%gorgonzola%' OR title ILIKE '%feta%' OR title ILIKE '%manchego%' OR slug LIKE '%cheese%' OR slug = 'brie-de-meaux' OR slug = 'parmigiano-reggiano' OR slug = 'manchego-curado' OR slug = 'gruyere' OR slug = 'comte-cheese' OR slug = 'camembert-normandie' OR slug = 'pecorino-romano' OR slug = 'dorblu' OR slug = 'gorgonzola-dolce' OR slug = 'feta-pdo' OR slug = 'parmigiano-reggiano-24' OR slug = 'camembert-aop' OR slug = 'brie-de-meaux-aop-extended')
  AND NOT ('cheese' = ANY(tags));

-- Add 'soft' tag to soft cheeses
UPDATE products 
SET tags = tags || ARRAY['soft'] 
WHERE (title ILIKE '%brie%' OR title ILIKE '%camembert%' OR slug = 'brie-de-meaux' OR slug = 'camembert-normandie' OR slug = 'camembert-aop')
  AND (tags @> ARRAY['cheese'] OR tags @> ARRAY['сыр'])
  AND NOT ('soft' = ANY(tags));

-- Add 'hard' tag to hard cheeses
UPDATE products 
SET tags = tags || ARRAY['hard'] 
WHERE (title ILIKE '%parmigiano%' OR title ILIKE '%груйер%' OR title ILIKE '%gruyere%' OR title ILIKE '%pecorino%' OR slug = 'parmigiano-reggiano' OR slug = 'parmigiano-reggiano-24' OR slug = 'gruyere' OR slug = 'pecorino-romano')
  AND (tags @> ARRAY['cheese'] OR tags @> ARRAY['сыр'])
  AND NOT ('hard' = ANY(tags));

-- Add 'blue' tag to blue cheeses
UPDATE products 
SET tags = tags || ARRAY['blue'] 
WHERE (title ILIKE '%дорблю%' OR title ILIKE '%gorgonzola%' OR title ILIKE '%dorblu%' OR slug = 'dorblu' OR slug = 'gorgonzola-dolce')
  AND (tags @> ARRAY['cheese'] OR tags @> ARRAY['сыр'])
  AND NOT ('blue' = ANY(tags));

-- Add 'aged' tag to aged cheeses
UPDATE products 
SET tags = tags || ARRAY['aged'] 
WHERE (title ILIKE '%parmigiano%' OR title ILIKE '%comte%' OR title ILIKE '%груйер%' OR title ILIKE '%gruyere%' OR title ILIKE '%комте%' OR slug = 'comte-cheese' OR slug = 'parmigiano-reggiano' OR slug = 'parmigiano-reggiano-24' OR slug = 'gruyere' OR slug = 'manchego-curado')
  AND (tags @> ARRAY['cheese'] OR tags @> ARRAY['сыр'] OR slug LIKE '%cheese%')
  AND NOT ('aged' = ANY(tags));

-- Ensure ham products have 'ham' and 'cured' tags
UPDATE products 
SET tags = tags || ARRAY['ham', 'cured'] 
WHERE (title ILIKE '%хамон%' OR title ILIKE '%ham%' OR slug LIKE '%ham%')
  AND NOT ('ham' = ANY(tags));

-- Add 'charcuterie' tag to cured meat products
UPDATE products 
SET tags = tags || ARRAY['charcuterie'] 
WHERE (tags @> ARRAY['ham'] OR tags @> ARRAY['cured'] OR title ILIKE '%chorizo%')
  AND NOT ('charcuterie' = ANY(tags));

