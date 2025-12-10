-- Drop indexes
DROP INDEX IF EXISTS idx_review_helpful_votes_user_id;
DROP INDEX IF EXISTS idx_review_helpful_votes_review_id;
DROP INDEX IF EXISTS idx_reviews_created_at;
DROP INDEX IF EXISTS idx_reviews_moderated;
DROP INDEX IF EXISTS idx_reviews_approved;
DROP INDEX IF EXISTS idx_reviews_rating;
DROP INDEX IF EXISTS idx_reviews_user_id;
DROP INDEX IF EXISTS idx_reviews_product_id;

-- Drop tables
DROP TABLE IF EXISTS review_helpful_votes;
DROP TABLE IF EXISTS reviews;










