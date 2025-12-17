-- Create tr69_configs table
CREATE TABLE IF NOT EXISTS tr69_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    acs_url VARCHAR(500) NOT NULL,
    acs_username VARCHAR(255),
    acs_password VARCHAR(255),
    connection_request_url VARCHAR(500),
    connection_request_username VARCHAR(255),
    connection_request_password VARCHAR(255),
    periodic_inform_interval INTEGER DEFAULT 300,
    periodic_inform_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id)
);

-- Create indexes
CREATE INDEX idx_tr69_configs_device_id ON tr69_configs(device_id);

-- Enable RLS on tr69_configs table
ALTER TABLE tr69_configs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Inherit access from devices table
CREATE POLICY tr69_configs_tenant_isolation ON tr69_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM devices d 
            WHERE d.id = tr69_configs.device_id 
            AND d.tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );
