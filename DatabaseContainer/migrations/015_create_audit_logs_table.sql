-- Create audit_logs table with partitioning by month
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions for 6 months
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_logs_2024_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE audit_logs_2024_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE audit_logs_2024_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

CREATE TABLE audit_logs_2024_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

CREATE TABLE audit_logs_2024_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

-- Create indexes on partitioned table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at);

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see audit logs for their tenant
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- RLS policy: System can insert audit logs for any tenant
CREATE POLICY audit_logs_system_insert ON audit_logs
    FOR INSERT
    WITH CHECK (true);
