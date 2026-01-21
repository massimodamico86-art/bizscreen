# Database Backup & Recovery Guide

This document describes the backup strategy, Point-in-Time Recovery (PITR), and disaster recovery procedures for BizScreen.

## Overview

BizScreen uses Supabase PostgreSQL as its primary database. Supabase provides built-in backup capabilities that we leverage for data protection.

## Backup Strategy

### Automatic Daily Backups

Supabase automatically creates daily backups for all projects:

| Plan | Backup Frequency | Retention |
|------|------------------|-----------|
| Free | Daily | 7 days |
| Pro | Daily | 7 days |
| Team | Daily | 14 days |
| Enterprise | Daily | 30+ days |

### Point-in-Time Recovery (PITR)

PITR allows restoration to any point within the retention window, not just daily snapshots.

**Enabling PITR (Pro plan and above):**

1. Go to Supabase Dashboard > Project Settings > Database
2. Navigate to "Backups" section
3. Enable "Point-in-Time Recovery"
4. Configure retention period (default: 7 days)

**PITR Benefits:**
- Recover from accidental data deletion
- Restore to any second within retention window
- Minimal data loss in disaster scenarios

## Backup Configuration

### Recommended Settings

```yaml
# Production Environment
backup:
  pitr_enabled: true
  retention_days: 14
  backup_time: "03:00 UTC"  # During low-traffic hours

# Staging Environment
backup:
  pitr_enabled: false
  retention_days: 7
```

### Storage Bucket Backups

Media files in Supabase Storage should have separate backup procedures:

1. **Enable versioning** on critical buckets (media-uploads, templates)
2. **Cross-region replication** for enterprise deployments
3. **Regular exports** of bucket contents to external storage

## Recovery Procedures

### Scenario 1: Accidental Data Deletion

**Small-scale (specific records):**

1. Identify the affected records and deletion time
2. Use PITR to restore to a point before deletion:
   ```
   Dashboard > Database > Backups > Restore to Point in Time
   ```
3. Select timestamp just before the incident
4. Restore to a new database instance
5. Extract needed records and migrate back

**Large-scale (table or database):**

1. Create a new project from backup
2. Verify data integrity
3. Update connection strings in application
4. DNS cutover if using custom domain

### Scenario 2: Database Corruption

1. **Immediate:** Set application to maintenance mode
2. **Assess:** Identify corruption scope and cause
3. **Restore:** Use latest clean backup point
4. **Verify:** Run integrity checks
5. **Resume:** Bring application back online

```bash
# Maintenance mode (update environment variable)
VITE_MAINTENANCE_MODE=true

# After recovery
VITE_MAINTENANCE_MODE=false
```

### Scenario 3: Complete Disaster Recovery

1. **Create new Supabase project**
2. **Restore from backup:**
   - Contact Supabase support for cross-project restoration
   - Or restore from manual backup (see Manual Backups)
3. **Update configurations:**
   - Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
   - DNS records if applicable
   - OAuth redirect URLs
4. **Verify all integrations**
5. **Resume operations**

## Manual Backup Procedures

### Database Export

For additional safety, perform periodic manual exports:

```bash
# Using Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Using pg_dump directly
pg_dump -h db.PROJECT_REF.supabase.co \
  -U postgres \
  -d postgres \
  --no-owner \
  --no-acl \
  -f backup_$(date +%Y%m%d).sql
```

### Automated Export Script

Create a scheduled backup script:

```bash
#!/bin/bash
# backup.sh - Run weekly via cron

BACKUP_DIR="/backups/bizscreen"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"

# Create backup
pg_dump "$SUPABASE_DB_URL" --no-owner --no-acl -f "$BACKUP_DIR/db_$TIMESTAMP.sql"

# Compress
gzip "$BACKUP_DIR/db_$TIMESTAMP.sql"

# Upload to S3/GCS (optional)
aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" s3://bizscreen-backups/

# Cleanup old local backups (keep 4 weeks)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +28 -delete
```

### Storage Backup

Export storage bucket contents:

```bash
# Using Supabase CLI
supabase storage ls media-uploads --recursive > file_list.txt

# Download all files
while read file; do
  supabase storage cp "media-uploads/$file" "./backup/storage/$file"
done < file_list.txt
```

## Testing Recovery

### Monthly Recovery Test

1. **Week 1:** Test PITR restoration to staging
2. **Week 2:** Verify data integrity and completeness
3. **Week 3:** Test application functionality against restored data
4. **Week 4:** Document findings and update procedures

### Recovery Test Checklist

- [ ] Can restore database to specific point in time
- [ ] All tables present with correct schema
- [ ] Foreign key relationships intact
- [ ] RLS policies functioning
- [ ] Application can connect and authenticate
- [ ] Critical workflows operational
- [ ] Performance acceptable

## Monitoring & Alerts

### Backup Health Checks

Monitor backup status in Supabase Dashboard:

1. Dashboard > Database > Backups
2. Verify "Last backup" is within 24 hours
3. Check backup size is reasonable

### Recommended Alerts

Set up monitoring for:

- Backup job failures
- Storage approaching limits
- Database size growth anomalies

```javascript
// Example: Health check for backup status
async function checkBackupHealth() {
  const lastBackup = await getLastBackupTime();
  const hoursSinceBackup = (Date.now() - lastBackup) / (1000 * 60 * 60);

  if (hoursSinceBackup > 25) {
    alertOps('Backup may have failed - last backup over 25 hours ago');
  }
}
```

## Data Retention Compliance

### GDPR Considerations

- Backups containing personal data must respect retention limits
- Document backup contents in privacy policy
- Account deletion requests apply to backups after retention period

### Backup Encryption

Supabase encrypts all backups at rest using AES-256. For additional security:

1. Enable SSL for all database connections
2. Use connection pooling with SSL enforcement
3. Rotate database credentials periodically

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Supabase Support | support@supabase.io | 24/7 (Pro+) |
| Database Admin | [internal] | Business hours |
| On-call Engineer | [internal] | 24/7 |

## Related Documentation

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [GDPR Data Retention](./GDPR_COMPLIANCE.md)
