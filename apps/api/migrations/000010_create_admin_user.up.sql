-- Create admin user
-- Email: admin@gastroshop.com
-- Password: Admin123!
-- The password hash is for "Admin123!" - you should change this in production!
INSERT INTO users (email, password_hash, role)
VALUES (
    'admin@gastroshop.com',
    '$2a$10$EbctoatfGRklofQiHaLKpeQ1mOODk9X7yPJxb7vZeBP343Hi5bZSO',
    'admin'
)
ON CONFLICT (email) DO UPDATE SET role = 'admin';

