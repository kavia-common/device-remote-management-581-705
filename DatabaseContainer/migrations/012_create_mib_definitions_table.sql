-- Create mib_definitions table
CREATE TABLE IF NOT EXISTS mib_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    oid VARCHAR(500) NOT NULL,
    description TEXT,
    syntax VARCHAR(100),
    access VARCHAR(50),
    status VARCHAR(50),
    parent_oid VARCHAR(500),
    module_name VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_mib_definitions_name ON mib_definitions(name);
CREATE INDEX idx_mib_definitions_oid ON mib_definitions(oid);
CREATE INDEX idx_mib_definitions_module ON mib_definitions(module_name);
CREATE INDEX idx_mib_definitions_parent_oid ON mib_definitions(parent_oid);

-- Enable RLS on mib_definitions table
ALTER TABLE mib_definitions ENABLE ROW LEVEL SECURITY;

-- RLS policy: All authenticated users can read MIB definitions
CREATE POLICY mib_definitions_read_all ON mib_definitions
    FOR SELECT
    USING (true);

-- RLS policy: Only admins can modify MIB definitions
CREATE POLICY mib_definitions_admin_write ON mib_definitions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = current_setting('app.current_user_id', true)::uuid 
            AND r.name = 'admin'
        )
    );
