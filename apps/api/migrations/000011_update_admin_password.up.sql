-- Update admin password if user exists
-- Email: admin@gastroshop.com
-- Password: Admin123!
UPDATE users 
SET password_hash = '$2a$10$EbctoatfGRklofQiHaLKpeQ1mOODk9X7yPJxb7vZeBP343Hi5bZSO',
    role = 'admin'
WHERE email = 'admin@gastroshop.com';

-- If admin doesn't exist, create it
INSERT INTO users (email, password_hash, role)
SELECT 'admin@gastroshop.com', '$2a$10$EbctoatfGRklofQiHaLKpeQ1mOODk9X7yPJxb7vZeBP343Hi5bZSO', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@gastroshop.com');


















