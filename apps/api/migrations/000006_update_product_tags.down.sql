-- Rollback: Remove category tags added in up migration
-- This is a best-effort rollback, as we can't perfectly restore the original state

-- Remove 'charcuterie' tag
UPDATE products 
SET tags = array_remove(tags, 'charcuterie')
WHERE 'charcuterie' = ANY(tags);

-- Remove 'ham' and 'cured' tags that we added
UPDATE products 
SET tags = array_remove(array_remove(tags, 'ham'), 'cured')
WHERE ('ham' = ANY(tags) OR 'cured' = ANY(tags))
  AND NOT (title ILIKE '%хамон%' OR title ILIKE '%ham%');

-- Note: We don't remove 'cheese' tags as they are likely correct for cheese products




























