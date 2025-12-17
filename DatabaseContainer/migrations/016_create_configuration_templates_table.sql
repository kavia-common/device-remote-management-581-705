-- Create configuration_templates table
CREATE TABLE IF NOT EXISTS configuration_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    protocol_type VARCHAR(50) NOT NULL,
    template_data JSONB NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Create indexes
CREATE INDEX idx_config_templates_tenant_id ON configuration_templates(tenant_id);
CREATE INDEX idx_config_templates_protocol ON configuration_templates(protocol_type);
CREATE INDEX idx_config_templates_created_by ON configuration_templates(created_by);
CREATE INDEX idx_config_templates_is_shared ON configuration_templates(is_shared);

-- Enable RLS on configuration_templates table
ALTER TABLE configuration_templates ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can see templates in their tenant or shared templates
CREATE POLICY config_templates_tenant_isolation ON configuration_templates
    FOR SELECT
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid 
        OR is_shared = true
    );

-- RLS policy: Users can modify templates they created in their tenant
CREATE POLICY config_templates_owner_write ON configuration_templates
    FOR ALL
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid 
        AND created_by = current_setting('app.current_user_id', true)::uuid
    );
