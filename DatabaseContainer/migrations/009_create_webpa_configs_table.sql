-- Create webpa_configs table
CREATE TABLE IF NOT EXISTS webpa_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    endpoint_url VARCHAR(500) NOT NULL,
    auth_token TEXT,
    client_id VARCHAR(255),
    client_secret VARCHAR(255),
    timeout INTEGER DEFAULT 30,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id)
);

-- Create indexes
CREATE INDEX idx_webpa_configs_device_id ON webpa_configs(device_id);

-- Enable RLS on webpa_configs table
ALTER TABLE webpa_configs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Inherit access from devices table
CREATE POLICY webpa_configs_tenant_isolation ON webpa_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM devices d 
            WHERE d.id = webpa_configs.device_id 
            AND d.tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );
