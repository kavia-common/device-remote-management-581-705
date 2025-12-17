-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    firmware_version VARCHAR(100),
    ip_address INET,
    mac_address MACADDR,
    status VARCHAR(50) DEFAULT 'active',
    last_seen TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX idx_devices_owner_id ON devices(owner_id);
CREATE INDEX idx_devices_ip_address ON devices(ip_address);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_metadata ON devices USING gin(metadata);

-- Enable RLS on devices table
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see devices in their tenant
CREATE POLICY devices_tenant_isolation ON devices
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
