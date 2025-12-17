-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own sessions
CREATE POLICY sessions_user_isolation ON sessions
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::uuid);
