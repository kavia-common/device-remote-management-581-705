# Database Container - Device Remote Management Platform

This container provides a PostgreSQL database with complete schema, migrations, Row-Level Security (RLS) policies, and seed data for the Device Remote Management platform.

## Features

- **Multi-tenant Architecture**: Complete tenant isolation using Row-Level Security (RLS)
- **Protocol Support**: Schema for SNMP (v2/v3), WebPA, TR-069/ACS, TR-369/USP protocols
- **Partitioned Tables**: Query history and audit logs partitioned by date for performance
- **Encrypted Fields**: pgcrypto extension enabled for sensitive data
- **Automated Migrations**: Schema versioning and migration tracking
- **Seed Data**: Default roles, permissions, and bootstrap admin user

## Database Schema

### Core Tables
- `users` - User accounts with tenant isolation
- `roles` - Role definitions with permissions
- `permissions` - Granular permission definitions
- `sessions` - User session management
- `devices` - Device registry with multi-protocol support
- `device_protocols` - Protocol configurations per device
- `device_tags` - Device categorization and tagging

### Protocol Configuration Tables
- `snmp_configs` - SNMP v2/v3 configuration
- `webpa_configs` - WebPA protocol configuration
- `tr69_configs` - TR-069/ACS configuration
- `tr369_configs` - TR-369/USP configuration

### Data Model Tables
- `mib_definitions` - SNMP MIB definitions
- `tr181_parameters` - TR-181 data model parameters

### History and Audit Tables
- `query_history` - Query execution history (partitioned by month)
- `audit_logs` - System audit trail (partitioned by month)
- `configuration_templates` - Reusable configuration templates

## Setup

### Prerequisites
- PostgreSQL 15+ installed
- Bash shell

### Starting the Database

```bash
cd DatabaseContainer
bash startup.sh
```

This will:
1. Start PostgreSQL on port 5000
2. Create the database and user
3. Run all migrations
4. Load seed data

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5000)
- `DB_NAME` - Database name (default: myapp)
- `DB_USER` - Database user (default: appuser)
- `DB_PASSWORD` - Database password

### Running Migrations Manually

```bash
bash run_migrations.sh
```

## Row-Level Security (RLS)

RLS is enabled on all tables to enforce multi-tenant isolation. The backend must set these session variables:

```sql
SET app.current_user_id = '<user-uuid>';
SET app.current_tenant_id = '<tenant-uuid>';
```

### RLS Policies

- **Tenant Isolation**: Users can only access data within their tenant
- **User Isolation**: Users can only access their own sessions and query history
- **Role-Based Access**: Admin role required for certain operations
- **Shared Resources**: Configuration templates can be shared across tenants

## Partitioning

### Query History
Partitioned by `created_at` month for optimal performance:
- Initial partitions: 2024-01 through 2024-06
- Add new partitions as needed:

```sql
CREATE TABLE query_history_2024_07 PARTITION OF query_history
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
```

### Audit Logs
Partitioned by `created_at` month:
- Initial partitions: 2024-01 through 2024-06
- Retention policy can be implemented by dropping old partitions

## Seed Data

### Default Roles
- **admin** - Full system access
- **operator** - Device management and query execution
- **viewer** - Read-only access

### Bootstrap Admin User
- Email: `admin@example.com`
- Password: `Admin@123` (change immediately in production)
- Tenant: Default tenant (00000000-0000-0000-0000-000000000001)

## Database Connections

### Connection String
```
postgresql://appuser:dbuser123@localhost:5000/myapp
```

### Using psql
```bash
psql -h localhost -U appuser -d myapp -p 5000
```

### From Application
Use the connection parameters from `.env` or environment variables set in `db_visualizer/postgres.env`.

## Backup and Restore

### Backup
```bash
bash backup_db.sh
```

Creates `database_backup.sql` with complete database dump.

### Restore
```bash
bash restore_db.sh
```

Restores from `database_backup.sql`.

## Migrations

Migrations are tracked in the `schema_migrations` table. Each migration file is:
- Named with format: `NNN_description.sql`
- Executed once in numerical order
- Recorded in `schema_migrations` upon success

### Creating New Migrations

1. Create a new file in `migrations/` directory:
   ```bash
   touch migrations/017_add_new_feature.sql
   ```

2. Add SQL statements:
   ```sql
   CREATE TABLE new_feature (...);
   CREATE INDEX ...;
   ALTER TABLE ...;
   ```

3. Run migrations:
   ```bash
   bash run_migrations.sh
   ```

## Security Considerations

1. **Change Default Credentials**: Update default passwords immediately
2. **Enable SSL**: Set `DB_SSL_MODE=require` in production
3. **Encrypt Sensitive Data**: Use pgcrypto for passwords, tokens, credentials
4. **Regular Backups**: Schedule automated backups
5. **Audit Logging**: All actions are logged in `audit_logs` table
6. **RLS Enforcement**: Never disable RLS on production tables

## Performance Tuning

### Indexes
All tables have appropriate indexes on:
- Foreign keys
- Frequently queried columns
- JSONB fields (using GIN indexes)
- Partition keys

### Connection Pooling
Configure connection pool in `.env`:
```
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=10000
```

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Monitor slow queries with `DB_LOG_SLOW_QUERIES=true`
- Set threshold with `DB_SLOW_QUERY_THRESHOLD_MS=1000`

## Monitoring

### Database Size
```sql
SELECT pg_size_pretty(pg_database_size('myapp'));
```

### Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Active Connections
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'myapp';
```

## Troubleshooting

### Migration Failed
1. Check `schema_migrations` table for applied migrations
2. Review error messages in migration output
3. Fix the failing migration SQL
4. Rerun `run_migrations.sh`

### RLS Access Denied
1. Verify session variables are set:
   ```sql
   SHOW app.current_user_id;
   SHOW app.current_tenant_id;
   ```
2. Check user's tenant_id matches data
3. Review RLS policies on affected table

### Performance Issues
1. Enable slow query logging
2. Check for missing indexes
3. Analyze query plans with EXPLAIN
4. Consider increasing connection pool size
5. Review partition strategy for large tables

## Support

For issues or questions, refer to the main project documentation or contact the development team.
