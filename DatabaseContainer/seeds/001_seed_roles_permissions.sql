-- Insert default roles
INSERT INTO roles (id, name, description, permissions) VALUES
    (gen_random_uuid(), 'admin', 'Administrator with full system access', 
     '["users:*", "devices:*", "protocols:*", "templates:*", "audit:read", "system:*"]'::jsonb),
    (gen_random_uuid(), 'operator', 'Device operator with query and configuration capabilities', 
     '["devices:read", "devices:write", "protocols:read", "protocols:write", "templates:read", "query:execute"]'::jsonb),
    (gen_random_uuid(), 'viewer', 'Read-only access to devices and query history', 
     '["devices:read", "protocols:read", "templates:read", "query:read"]'::jsonb)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    ('users_read', 'users', 'read', 'View user information'),
    ('users_write', 'users', 'write', 'Create and update users'),
    ('users_delete', 'users', 'delete', 'Delete users'),
    ('devices_read', 'devices', 'read', 'View device information'),
    ('devices_write', 'devices', 'write', 'Create and update devices'),
    ('devices_delete', 'devices', 'delete', 'Delete devices'),
    ('protocols_read', 'protocols', 'read', 'View protocol configurations'),
    ('protocols_write', 'protocols', 'write', 'Modify protocol configurations'),
    ('templates_read', 'templates', 'read', 'View configuration templates'),
    ('templates_write', 'templates', 'write', 'Create and update templates'),
    ('query_execute', 'query', 'execute', 'Execute device queries'),
    ('audit_read', 'audit', 'read', 'View audit logs'),
    ('system_admin', 'system', 'admin', 'Full system administration')
ON CONFLICT (name) DO NOTHING;
