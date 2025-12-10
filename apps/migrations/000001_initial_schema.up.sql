-- Create regions table (if not exists)
CREATE TABLE IF NOT EXISTS regions (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    geojson_feature JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    tags TEXT[] DEFAULT '{}',
    region_code VARCHAR(10) REFERENCES regions(code),
    images TEXT[] DEFAULT '{}',
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    items JSONB NOT NULL DEFAULT '[]',
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(255),
    shipping_address JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_products_region ON products(region_code);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_in_stock ON products(in_stock);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_created_at ON events(created_at);
