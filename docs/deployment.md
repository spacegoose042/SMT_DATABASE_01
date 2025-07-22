# Deployment Guide

Complete guide for deploying and maintaining the SMT Production Schedule Database on Railway.

## Deployment Overview

### Architecture
- **Platform**: Railway (cloud deployment)
- **Database**: PostgreSQL (automatically provisioned)
- **Application**: Flask web service
- **Integration**: GitHub auto-deploy
- **Monitoring**: Health checks and status endpoints

### Deployment Flow
1. **GitHub Repository** → **Railway Project** → **Auto-deploy on push**
2. **Database Provisioning** → **Schema Initialization** → **Service Startup**
3. **Health Monitoring** → **Continuous Operation** → **Backup Management**

## Railway Setup

### 1. Project Creation

#### Via Railway Dashboard
1. **Sign In**: Visit [Railway.app](https://railway.app) and sign in with GitHub
2. **Create Project**: Click "New Project"
3. **Select Source**: Choose "Deploy from GitHub repo"
4. **Select Repository**: Choose your `SMT_DATABASE_01` repository
5. **Configure Branch**: Select `main` branch for auto-deploy

#### Via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project
railway link
```

### 2. Service Configuration

#### Web Service Setup
The `railway.json` file configures the web service:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python app.py",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

#### Environment Variables
Configure these variables in Railway dashboard:

**Required Variables:**
```
AUTO_INIT_DB=true
DB_SCHEMA_FILE=database_schema.sql
DB_SEED_FILE=seed_data.sql
DEBUG=false
LOG_LEVEL=INFO
```

**Optional Variables:**
```
CETEC_API_KEY=
CETEC_API_URL=
SECRET_KEY=your-secret-key-here
```

### 3. Database Service

#### PostgreSQL Provisioning
1. **Add Database**: In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. **Auto-Linking**: Railway automatically links database to web service
3. **Connection String**: `DATABASE_URL` is automatically populated

#### Database Configuration
- **Version**: PostgreSQL 13+
- **Storage**: Auto-scaling based on usage
- **Backups**: Automatic daily backups
- **Connection Pooling**: Managed by Railway

## Deployment Process

### 1. Initial Deployment

#### Trigger Deployment
```bash
# Push to main branch (triggers auto-deploy)
git add .
git commit -m "Initial deployment"
git push origin main
```

#### Monitor Deployment
1. **Build Logs**: Watch build process in Railway dashboard
2. **Health Check**: Monitor `/health` endpoint
3. **Database Init**: Check schema initialization logs
4. **Service Status**: Verify service is running

#### Expected Timeline
- **Build**: 2-5 minutes
- **Database Init**: 30-60 seconds
- **Health Check**: 1-2 minutes
- **Total**: 5-10 minutes

### 2. Continuous Deployment

#### Auto-Deploy Configuration
- **Trigger**: Push to `main` branch
- **Build**: Automatic using NIXPACKS
- **Deployment**: Zero-downtime deployment
- **Health Check**: Automatic validation

#### Deployment Stages
1. **Build Stage**: Install dependencies, prepare application
2. **Deploy Stage**: Deploy new version alongside existing
3. **Health Check**: Validate new deployment
4. **Switch Traffic**: Route traffic to new version
5. **Cleanup**: Remove old version

### 3. Environment Management

#### Development Environment
```bash
# Local development
export DATABASE_URL="postgresql://localhost:5432/smt_dev"
export DEBUG=true
export LOG_LEVEL=DEBUG
python app.py
```

#### Staging Environment
```bash
# Railway staging (if needed)
railway up --environment staging
```

#### Production Environment
```bash
# Railway production (main branch)
railway up --environment production
```

## Monitoring and Health Checks

### 1. Health Monitoring

#### Health Check Endpoint
```bash
# Check service health
curl https://your-app.railway.app/health

# Expected response
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Status Endpoint
```bash
# Detailed system status
curl https://your-app.railway.app/api/status

# Expected response
{
  "success": true,
  "data": {
    "status": "operational",
    "database": {
      "connected": true,
      "tables": {
        "work_orders": 1250,
        "production_lines": 5
      }
    },
    "version": "1.0.0",
    "uptime": "2 days, 5 hours"
  }
}
```

### 2. Log Monitoring

#### Railway Logs
1. **Access Logs**: Railway dashboard → Service → Logs
2. **Real-time Monitoring**: Live log streaming
3. **Log Levels**: DEBUG, INFO, WARNING, ERROR
4. **Log Retention**: 30 days (Railway default)

#### Application Logs
```python
# Log levels configured via LOG_LEVEL environment variable
import logging
logging.info("Application started")
logging.error("Database connection failed")
```

### 3. Performance Monitoring

#### Key Metrics
- **Response Time**: API endpoint response times
- **Database Performance**: Query execution times
- **Memory Usage**: Application memory consumption
- **CPU Usage**: Processing load
- **Error Rate**: Failed requests percentage

#### Monitoring Tools
- **Railway Dashboard**: Built-in metrics
- **Application Logs**: Custom performance logging
- **Health Checks**: Automated monitoring
- **Status Endpoints**: Manual verification

## Maintenance Procedures

### 1. Database Maintenance

#### Backup Management
```bash
# Weekly backup script
python scripts/backup.py --create-backup

# Database information
python scripts/backup.py --db-info

# Cleanup old backups
python scripts/backup.py --cleanup --days 30
```

#### Schema Updates
```bash
# Manual database initialization
curl -X POST https://your-app.railway.app/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"force": false, "seed_data": true}'
```

### 2. Application Updates

#### Code Updates
```bash
# Deploy updates
git add .
git commit -m "Update description"
git push origin main

# Monitor deployment
# Check Railway dashboard for build status
```

#### Dependency Updates
```bash
# Update requirements.txt
pip freeze > requirements.txt

# Commit and deploy
git add requirements.txt
git commit -m "Update dependencies"
git push origin main
```

### 3. Environment Updates

#### Environment Variable Changes
1. **Railway Dashboard**: Variables → Edit
2. **Redeploy**: Trigger new deployment
3. **Verify**: Check application behavior

#### Configuration Updates
```bash
# Update railway.json
# Commit and push
git add railway.json
git commit -m "Update deployment config"
git push origin main
```

## Troubleshooting

### 1. Deployment Issues

#### Build Failures
**Symptoms**: Build logs show errors
**Common Causes**:
- Missing dependencies in `requirements.txt`
- Python version incompatibility
- Syntax errors in code
- Missing environment variables

**Solutions**:
```bash
# Check requirements.txt
cat requirements.txt

# Test locally
pip install -r requirements.txt
python app.py

# Check syntax
python -m py_compile app.py
```

#### Health Check Failures
**Symptoms**: Service shows unhealthy status
**Common Causes**:
- Database connection issues
- Missing environment variables
- Application startup errors

**Solutions**:
```bash
# Check environment variables
railway variables

# Check database connection
railway run python -c "import psycopg2; print('DB OK')"

# Check application logs
railway logs
```

### 2. Runtime Issues

#### Database Connection Problems
**Symptoms**: 503 errors, database unavailable
**Solutions**:
1. **Check DATABASE_URL**: Verify in Railway variables
2. **Restart Service**: Use Railway dashboard restart
3. **Check PostgreSQL**: Verify database service is running
4. **Connection Pool**: Monitor connection limits

#### Performance Issues
**Symptoms**: Slow response times, timeouts
**Solutions**:
1. **Database Optimization**: Check query performance
2. **Connection Pooling**: Optimize database connections
3. **Caching**: Implement response caching
4. **Scaling**: Consider Railway scaling options

### 3. Data Issues

#### Import Problems
**Symptoms**: CSV import failures
**Solutions**:
```bash
# Check file format
head -5 Production_Schedule_Schedule_Table.csv

# Validate data
railway run python csv_import.py data.csv --dry-run

# Check database constraints
railway run python -c "from app import db; print('DB OK')"
```

#### Export Problems
**Symptoms**: Export failures, missing data
**Solutions**:
```bash
# Check export script
python csv_export.py work_orders --help

# Test export locally
python csv_export.py work_orders

# Check file permissions
ls -la exports/
```

## Security Considerations

### 1. Environment Security

#### Environment Variables
- **Never commit secrets**: Use Railway variables
- **Rotate regularly**: Update secrets periodically
- **Access control**: Limit variable access
- **Audit trail**: Monitor variable changes

#### Database Security
- **Connection encryption**: Railway handles SSL
- **Access control**: Railway manages access
- **Backup security**: Encrypted backups
- **Network isolation**: Railway network security

### 2. Application Security

#### API Security
- **Input validation**: Validate all inputs
- **SQL injection**: Use parameterized queries
- **Rate limiting**: Implement request limits
- **Error handling**: Don't expose sensitive info

#### Access Control
- **Role-based access**: Implement user roles
- **API authentication**: Use API keys
- **Session management**: Secure session handling
- **Audit logging**: Log access attempts

## Scaling and Performance

### 1. Railway Scaling

#### Automatic Scaling
- **CPU-based**: Scale based on CPU usage
- **Memory-based**: Scale based on memory usage
- **Request-based**: Scale based on request volume
- **Custom metrics**: Scale based on custom metrics

#### Manual Scaling
```bash
# Scale service
railway scale --service web --count 2

# Check scaling
railway status
```

### 2. Database Scaling

#### PostgreSQL Scaling
- **Storage**: Auto-scaling storage
- **Connections**: Connection pool management
- **Performance**: Query optimization
- **Backups**: Automated backup scaling

#### Performance Optimization
```sql
-- Add indexes for performance
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_dates ON work_orders(kit_date, ship_date);

-- Monitor slow queries
SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

## Disaster Recovery

### 1. Backup Strategy

#### Automated Backups
- **Daily backups**: Railway automatic backups
- **Weekly exports**: CSV export backups
- **Schema backups**: Database schema backups
- **Configuration backups**: Environment backups

#### Manual Backups
```bash
# Create full backup
python scripts/backup.py --create-backup

# Export all data
python csv_export.py full_backup

# Backup configuration
railway variables > backup_variables.txt
```

### 2. Recovery Procedures

#### Database Recovery
```bash
# Restore from Railway backup
# Use Railway dashboard restore function

# Restore from CSV
python csv_import.py backup_data.csv

# Verify recovery
python scripts/backup.py --db-info
```

#### Application Recovery
```bash
# Redeploy application
git push origin main

# Restore environment
railway variables < backup_variables.txt

# Verify functionality
curl https://your-app.railway.app/health
```

## Support and Resources

### 1. Railway Support
- **Documentation**: [Railway Docs](https://docs.railway.app)
- **Community**: Railway Discord/Slack
- **Support**: Railway dashboard support
- **Status**: [Railway Status](https://status.railway.app)

### 2. Application Support
- **Documentation**: Project documentation
- **Issues**: GitHub issues
- **Logs**: Railway application logs
- **Monitoring**: Health check endpoints

### 3. Emergency Contacts
- **Development Team**: Project maintainers
- **Railway Support**: Railway support channels
- **Database Issues**: Railway database support
- **Deployment Issues**: Railway deployment support

## Best Practices

### 1. Deployment Best Practices
- **Test locally**: Always test before deploying
- **Use staging**: Test in staging environment
- **Monitor deployments**: Watch build and health checks
- **Rollback plan**: Have rollback procedures ready

### 2. Monitoring Best Practices
- **Health checks**: Regular health monitoring
- **Log monitoring**: Watch application logs
- **Performance tracking**: Monitor key metrics
- **Alert setup**: Configure alerts for issues

### 3. Maintenance Best Practices
- **Regular backups**: Automated backup schedule
- **Security updates**: Keep dependencies updated
- **Performance optimization**: Regular performance reviews
- **Documentation updates**: Keep docs current

### 4. Security Best Practices
- **Secret management**: Use Railway variables
- **Access control**: Implement proper permissions
- **Audit logging**: Log all access attempts
- **Regular reviews**: Security audit schedule 