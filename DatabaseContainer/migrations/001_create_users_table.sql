-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    tenant_id UUID NOT NULL,
    role_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Create index on tenant_id for multi-tenant queries
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see users in their tenant
CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- RLS policy: Allow service role to bypass RLS
CREATE POLICY users_service_access ON users
    FOR ALL
    TO postgres
    USING (true);
