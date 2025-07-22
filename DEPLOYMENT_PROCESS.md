# SMT Database Deployment Process

## Development & Deployment Process:

### **Phase 1: Local Development**
1. **Create Database Schema Files**
   - `database_schema.sql` - Complete PostgreSQL schema with all tables, indexes, triggers
   - `migrations/` folder - For future schema changes
   - `seed_data.sql` - Initial data (production lines, default config)

2. **Create Railway Configuration**
   - `railway.json` - Tells Railway this is a database project
   - `railway.toml` - Environment variables and deployment settings

3. **Create Import/Export Scripts**
   - `csv_import.py` - Python script for CSV data import
   - `requirements.txt` - Python dependencies
   - `scripts/` folder - Additional utility scripts

4. **Create Documentation**
   - `README.md` - Project overview and setup instructions
   - `docs/` folder - Detailed documentation

### **Phase 2: GitHub Setup**
1. **Commit All Files**
   ```bash
   git add .
   git commit -m "Initial database schema and configuration"
   git push origin main
   ```

2. **Verify Repository Structure**
   - All files are in the correct locations
   - No sensitive data (passwords, API keys) in the repo

### **Phase 3: Railway Deployment**
1. **Railway Project Configuration**
   - Railway will detect the PostgreSQL service
   - Set environment variables (DATABASE_URL will be auto-generated)
   - Configure auto-deploy on main branch pushes

2. **Database Initialization**
   - Railway creates PostgreSQL instance
   - Run initial schema creation
   - Import seed data (production lines, default config)

3. **Test Deployment**
   - Verify database connection
   - Test CSV import functionality
   - Validate all tables and relationships

### **Phase 4: Data Import**
1. **Import Your CSV Data**
   - Use the CSV import script
   - Validate all data imported correctly
   - Check for any import errors

2. **Verify System**
   - Test all reports and queries
   - Validate business rules (ship dates, etc.)
   - Check audit trail functionality

## File Structure We'll Create:

```
SMT_DATABASE_01/
├── database_schema.sql          # Main schema
├── migrations/                   # Future schema changes
│   └── 001_initial_schema.sql
├── seed_data.sql                # Initial data
├── railway.json                 # Railway configuration
├── railway.toml                 # Environment variables
├── csv_import.py                # CSV import script
├── requirements.txt             # Python dependencies
├── scripts/                     # Utility scripts
│   ├── backup.py
│   └── export.py
├── docs/                        # Documentation
│   ├── setup.md
│   └── api.md
├── README.md                    # Project overview
├── SMT_LINE_PROPERTIES.md       # SMT line properties reference
└── DEPLOYMENT_PROCESS.md        # This file
```

## Questions Before We Start:

1. **Deployment Order**: Should we create all the files first, then push to GitHub, or do you want to do it incrementally?

2. **Database Initialization**: Do you want the schema to run automatically on first deployment, or manually trigger it?

3. **Environment Variables**: Any specific environment variables you need beyond the standard DATABASE_URL?

4. **Testing Strategy**: How would you like to test the system once it's deployed?

## Notes:
- Railway project is already created and connected to GitHub
- Auto-deploy is configured for main branch pushes
- PostgreSQL service will be automatically detected
- DATABASE_URL will be provided by Railway 