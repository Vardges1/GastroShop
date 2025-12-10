-- Add blocked field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;

-- Create index for blocked users
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);


















