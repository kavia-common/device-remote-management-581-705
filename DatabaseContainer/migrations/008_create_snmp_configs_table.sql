-- Create snmp_configs table
CREATE TABLE IF NOT EXISTS snmp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    snmp_version VARCHAR(10) NOT NULL CHECK (snmp_version IN ('v2c', 'v3')),
    community_string VARCHAR(255),
    security_level VARCHAR(50),
    auth_protocol VARCHAR(50),
    auth_password VARCHAR(255),
    priv_protocol VARCHAR(50),
    priv_password VARCHAR(255),
    context_name VARCHAR(255),
    port INTEGER DEFAULT 161,
    timeout INTEGER DEFAULT 5,
    retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id)
);

-- Create indexes
CREATE INDEX idx_snmp_configs_device_id ON snmp_configs(device_id);
CREATE INDEX idx_snmp_configs_version ON snmp_configs(snmp_version);

-- Enable RLS on snmp_configs table
ALTER TABLE snmp_configs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Inherit access from devices table
CREATE POLICY snmp_configs_tenant_isolation ON snmp_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM devices d 
            WHERE d.id = snmp_configs.device_id 
            AND d.tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );
