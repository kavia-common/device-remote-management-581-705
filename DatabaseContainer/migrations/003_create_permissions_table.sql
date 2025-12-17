-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);

-- Enable RLS on permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- RLS policy: All authenticated users can read permissions
CREATE POLICY permissions_read_all ON permissions
    FOR SELECT
    USING (true);
