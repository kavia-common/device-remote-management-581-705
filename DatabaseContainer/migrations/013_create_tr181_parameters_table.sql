-- Create tr181_parameters table
CREATE TABLE IF NOT EXISTS tr181_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_path VARCHAR(500) UNIQUE NOT NULL,
    parameter_name VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(100),
    access_type VARCHAR(50),
    version VARCHAR(50),
    parent_path VARCHAR(500),
    is_multi_instance BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tr181_parameters_path ON tr181_parameters(parameter_path);
CREATE INDEX idx_tr181_parameters_name ON tr181_parameters(parameter_name);
CREATE INDEX idx_tr181_parameters_parent ON tr181_parameters(parent_path);
CREATE INDEX idx_tr181_parameters_metadata ON tr181_parameters USING gin(metadata);

-- Enable RLS on tr181_parameters table
ALTER TABLE tr181_parameters ENABLE ROW LEVEL SECURITY;

-- RLS policy: All authenticated users can read TR-181 parameters
CREATE POLICY tr181_parameters_read_all ON tr181_parameters
    FOR SELECT
    USING (true);

-- RLS policy: Only admins can modify TR-181 parameters
CREATE POLICY tr181_parameters_admin_write ON tr181_parameters
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = current_setting('app.current_user_id', true)::uuid 
            AND r.name = 'admin'
        )
    );
