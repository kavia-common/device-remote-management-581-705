-- Create device_protocols table
CREATE TABLE IF NOT EXISTS device_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    protocol_type VARCHAR(50) NOT NULL CHECK (protocol_type IN ('snmp', 'webpa', 'tr69', 'tr369')),
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, protocol_type)
);

-- Create indexes
CREATE INDEX idx_device_protocols_device_id ON device_protocols(device_id);
CREATE INDEX idx_device_protocols_protocol_type ON device_protocols(protocol_type);
CREATE INDEX idx_device_protocols_config ON device_protocols USING gin(config);

-- Enable RLS on device_protocols table
ALTER TABLE device_protocols ENABLE ROW LEVEL SECURITY;

-- RLS policy: Inherit access from devices table
CREATE POLICY device_protocols_tenant_isolation ON device_protocols
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM devices d 
            WHERE d.id = device_protocols.device_id 
            AND d.tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );
