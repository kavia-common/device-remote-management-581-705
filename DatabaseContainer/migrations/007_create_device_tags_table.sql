-- Create device_tags table
CREATE TABLE IF NOT EXISTS device_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_value VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_device_tags_device_id ON device_tags(device_id);
CREATE INDEX idx_device_tags_name ON device_tags(tag_name);
CREATE INDEX idx_device_tags_value ON device_tags(tag_value);

-- Enable RLS on device_tags table
ALTER TABLE device_tags ENABLE ROW LEVEL SECURITY;

-- RLS policy: Inherit access from devices table
CREATE POLICY device_tags_tenant_isolation ON device_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM devices d 
            WHERE d.id = device_tags.device_id 
            AND d.tenant_id = current_setting('app.current_tenant_id', true)::uuid
        )
    );
