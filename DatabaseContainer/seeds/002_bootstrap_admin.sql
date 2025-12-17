-- Create default tenant for bootstrap
DO $$
DECLARE
    default_tenant_id UUID;
    admin_role_id UUID;
    admin_user_id UUID;
BEGIN
    -- Generate a default tenant ID (this should be replaced with proper tenant creation in production)
    default_tenant_id := '00000000-0000-0000-0000-000000000001'::uuid;
    
    -- Get admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Create bootstrap admin user (password: Admin@123)
    -- Password hash generated with bcrypt for 'Admin@123'
    INSERT INTO users (id, email, password_hash, full_name, tenant_id, role_id, is_active)
    VALUES (
        gen_random_uuid(),
        'admin@example.com',
        '$2a$10$rLhqzJQjH7VzPZ8vL0YJqOX4Y6wE1fVr7vIH8Hp3MZkGdQ2QZyLNq',
        'System Administrator',
        default_tenant_id,
        admin_role_id,
        true
    )
    ON CONFLICT (email) DO NOTHING;
    
END $$;
