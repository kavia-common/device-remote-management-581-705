-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on role name
CREATE INDEX idx_roles_name ON roles(name);

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS policy: All authenticated users can read roles
CREATE POLICY roles_read_all ON roles
    FOR SELECT
    USING (true);

-- RLS policy: Only admins can modify roles
CREATE POLICY roles_admin_write ON roles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = current_setting('app.current_user_id', true)::uuid 
            AND r.name = 'admin'
        )
    );
