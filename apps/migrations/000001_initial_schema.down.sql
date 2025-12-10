-- Drop indexes
DROP INDEX IF EXISTS idx_events_created_at;
DROP INDEX IF EXISTS idx_events_type;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_orders_user_id;
DROP INDEX IF EXISTS idx_products_in_stock;
DROP INDEX IF EXISTS idx_products_tags;
DROP INDEX IF EXISTS idx_products_region;

-- Drop tables
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS regions;
