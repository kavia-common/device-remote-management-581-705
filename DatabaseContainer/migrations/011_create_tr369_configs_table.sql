-- Create tr369_configs table
CREATE TABLE IF NOT EXISTS tr369_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    controller_endpoint VARCHAR(500) NOT NULL,
    endpoint_id VARCHAR(255) NOT NULL,
    mtp_protocol VARCHAR(50) DEFAULT 'STOMP' CHECK (mtp_protocol IN ('STOMP', 'WebSocket', 'MQTT', 'CoAP')),
    auth_method VARCHAR(50),
    credentials TEXT,
    certificate TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id)
);

-- Create indexes
CREATE INDEX idx_tr369_configs_device_id ON tr369_configs(device_id);
CREATE INDEX idx_tr369_configs_endpoint_id ON tr369_configs(endpoint_id);

-- Enable RLS on tr369_configs table
ALTER TABLE tr369_configs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Inherit access from devices table
CREATE POLICY tr369_configs_tenant_isolation ON tr369_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM devices d 
            WHERE d.id = tr369_configs.device_id 
            AND d.tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );
