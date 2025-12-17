-- Create query_history table with partitioning by month
CREATE TABLE IF NOT EXISTS query_history (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    protocol_type VARCHAR(50) NOT NULL,
    query_type VARCHAR(100) NOT NULL,
    query_parameters JSONB,
    response_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions for 6 months
CREATE TABLE query_history_2024_01 PARTITION OF query_history
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE query_history_2024_02 PARTITION OF query_history
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE query_history_2024_03 PARTITION OF query_history
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

CREATE TABLE query_history_2024_04 PARTITION OF query_history
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');

CREATE TABLE query_history_2024_05 PARTITION OF query_history
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');

CREATE TABLE query_history_2024_06 PARTITION OF query_history
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

-- Create indexes on partitioned table
CREATE INDEX idx_query_history_user_id ON query_history(user_id, created_at);
CREATE INDEX idx_query_history_device_id ON query_history(device_id, created_at);
CREATE INDEX idx_query_history_protocol ON query_history(protocol_type, created_at);
CREATE INDEX idx_query_history_status ON query_history(status, created_at);

-- Enable RLS on query_history table
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own query history
CREATE POLICY query_history_user_isolation ON query_history
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::uuid);
