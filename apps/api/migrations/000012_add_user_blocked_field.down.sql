-- Remove blocked field from users table
DROP INDEX IF EXISTS idx_users_blocked;
ALTER TABLE users DROP COLUMN IF EXISTS blocked;


















