# Setup Guide

Complete setup instructions for the SMT Production Schedule Database.

## Prerequisites

### Required Accounts
- **GitHub Account**: For repository hosting and version control
- **Railway Account**: For cloud deployment and PostgreSQL database
- **Local Development Environment**: Python 3.8+ and Git

### System Requirements
- **Python**: 3.8 or higher
- **Git**: For version control
- **PostgreSQL**: 12 or higher (provided by Railway)
- **Memory**: Minimum 512MB RAM for local development
- **Storage**: 1GB free space for local development

## Local Development Setup

### 1. Clone Repository
```bash
git clone <your-repository-url>
cd SMT_DATABASE_01
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/smt_database

# Application Settings
AUTO_INIT_DB=true
DEBUG=true
LOG_LEVEL=INFO
SECRET_KEY=your-secret-key-here

# Future CETEC ERP Integration
CETEC_API_KEY=
CETEC_API_URL=

# Database Initialization
DB_SCHEMA_FILE=database_schema.sql
DB_SEED_FILE=seed_data.sql
```

### 4. Local Database Setup (Optional)
If you want to run a local PostgreSQL database:

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb smt_database

# Or use Docker
docker run --name smt-postgres \
  -e POSTGRES_DB=smt_database \
  -e POSTGRES_USER=smt_user \
  -e POSTGRES_PASSWORD=smt_password \
  -p 5432:5432 \
  -d postgres:13
```

### 5. Initialize Database
```bash
# Run the Flask application (auto-initializes database)
python app.py

# Or manually initialize
python -c "
from app import initialize_database
initialize_database()
"
```

### 6. Verify Setup
```bash
# Check application health
curl http://localhost:5000/health

# Check database status
curl http://localhost:5000/api/status
```

## Railway Deployment Setup

### 1. Railway Account Setup
1. Visit [Railway.app](https://railway.app)
2. Sign up with GitHub account
3. Create a new project

### 2. GitHub Repository Setup
1. Create a new repository on GitHub
2. Push your code to the repository:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 3. Railway Project Configuration
1. **Connect to GitHub**:
   - In Railway dashboard, click "Deploy from GitHub repo"
   - Select your repository
   - Choose the `main` branch

2. **Add PostgreSQL Database**:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically provision a PostgreSQL database

3. **Configure Environment Variables**:
   - Go to your web service settings
   - Add the following variables:
     ```
     AUTO_INIT_DB=true
     DB_SCHEMA_FILE=database_schema.sql
     DB_SEED_FILE=seed_data.sql
     DEBUG=false
     LOG_LEVEL=INFO
     ```

4. **Link Database to Web Service**:
   - In your web service settings, add the `DATABASE_URL` variable
   - Railway will automatically populate this from the PostgreSQL service

### 4. Deployment Configuration
The `railway.json` file configures the deployment:
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

### 5. Deploy
1. **Automatic Deployment**: Railway will deploy automatically when you push to `main`
2. **Manual Deployment**: Use Railway CLI:
```bash
railway login
railway link
railway up
```

### 6. Verify Deployment
1. **Check Build Logs**: Monitor the deployment in Railway dashboard
2. **Health Check**: Visit your Railway domain + `/health`
3. **Database Status**: Visit your Railway domain + `/api/status`

## Data Import Setup

### 1. Prepare CSV Data
Ensure your CSV file follows the expected format:
- Work Order Number (unique identifier)
- Customer information
- Assembly details
- Scheduling information
- Dates (kit date, ship date)

### 2. Upload CSV to Railway
**Option A: Via Railway Dashboard**
1. Go to your Railway project
2. Navigate to the web service
3. Look for file upload options in the dashboard

**Option B: Via Railway CLI**
```bash
# Upload file to Railway
railway run -- cat Production_Schedule_Schedule_Table.csv > /tmp/data.csv
```

**Option C: Via Git**
```bash
# Add CSV to repository
git add Production_Schedule_Schedule_Table.csv
git commit -m "Add production schedule data"
git push origin main
```

### 3. Import Data
```bash
# Connect to Railway
railway link

# Dry run to validate
railway run python csv_import.py Production_Schedule_Schedule_Table.csv --dry-run

# Import data
railway run python csv_import.py Production_Schedule_Schedule_Table.csv
```

## Configuration Options

### Database Configuration
| Setting | Description | Default |
|---------|-------------|---------|
| `AUTO_INIT_DB` | Auto-initialize database on startup | `true` |
| `DB_SCHEMA_FILE` | Schema file path | `database_schema.sql` |
| `DB_SEED_FILE` | Seed data file path | `seed_data.sql` |

### Application Configuration
| Setting | Description | Default |
|---------|-------------|---------|
| `DEBUG` | Enable debug mode | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `SECRET_KEY` | Flask secret key | Auto-generated |

### Production Line Configuration
Default production line settings:
- **Line 1**: 2.0x time multiplier (slower)
- **Lines 2-4**: 1.0x time multiplier (standard)
- **Line 5**: Hand placement (manual activation only)
- **Default Schedule**: 8 hours/day, 5 days/week, 1 hour lunch

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```
Error: DATABASE_URL environment variable not set
```
**Solution**: Ensure PostgreSQL service is added and linked in Railway

**2. Schema Initialization Failed**
```
Error: relation "work_orders" already exists
```
**Solution**: Database already initialized, this is normal

**3. CSV Import Failed**
```
Error: No such file or directory
```
**Solution**: Ensure CSV file is uploaded to Railway environment

**4. Deployment Failed**
```
Error: Health check failed
```
**Solution**: Check build logs for specific error messages

### Debug Mode
Enable debug mode for detailed error messages:
```bash
# Set in Railway environment variables
DEBUG=true
LOG_LEVEL=DEBUG
```

### Logs
View application logs in Railway dashboard:
1. Go to your web service
2. Click "Logs" tab
3. Monitor real-time application output

## Security Considerations

### Environment Variables
- Never commit sensitive data to Git
- Use Railway's environment variable system
- Rotate secrets regularly

### Database Security
- Railway automatically secures PostgreSQL
- Use connection pooling for production
- Regular backups are essential

### Access Control
- Implement role-based permissions
- Use API keys for external integrations
- Monitor access logs

## Next Steps

After successful setup:
1. **Import Data**: Load your CSV production schedule
2. **Test Functionality**: Verify all features work correctly
3. **Configure Users**: Set up user accounts and permissions
4. **Monitor Performance**: Check database performance
5. **Set Up Backups**: Configure automated backup schedule

## Support

If you encounter issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review Railway deployment logs
3. Verify environment variable configuration
4. Contact the development team 