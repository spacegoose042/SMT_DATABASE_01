# SMT Production Schedule Database

A production scheduling database system designed for low-volume/high-mix contract electronic manufacturing facilities. Built with PostgreSQL, Flask, and deployed on Railway.

## 🚀 Features

- **Work Order Management**: Track work orders with estimated vs actual run times
- **Production Line Scheduling**: Support for 4 SMT lines + 1 hand placement line
- **Smart Scheduling**: Automatic consideration of line time multipliers and capacity
- **Trolley Management**: Track trolley usage across production lines
- **Role-Based Access**: Admin, Scheduler, and Viewer permissions
- **CSV Import/Export**: Bulk data operations with validation and merge logic
- **Historical Data**: Maintain complete work order history
- **Line Downtime Tracking**: Monitor maintenance and malfunction periods
- **Weekly Backups**: Automated backup system
- **Future-Ready**: API endpoints for CETEC ERP integration

## 🏗️ Architecture

- **Database**: PostgreSQL with comprehensive schema
- **Backend**: Flask web application
- **Deployment**: Railway with GitHub auto-deploy
- **Data Import**: CSV processing with validation
- **Monitoring**: Health checks and status endpoints

## 📋 Quick Start

### Prerequisites
- Railway account
- GitHub repository
- PostgreSQL database (automatically provisioned by Railway)

### Deployment
1. **Fork/Clone** this repository
2. **Connect** to Railway via GitHub
3. **Deploy** - Database schema initializes automatically
4. **Import Data** - Use CSV import scripts or web interface

### Local Development
```bash
# Clone repository
git clone <your-repo-url>
cd SMT_DATABASE_01

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="your-postgresql-url"
export AUTO_INIT_DB="true"

# Run application
python app.py
```

## 📊 Database Schema

### Core Tables
- **`work_orders`** - Main work order data with scheduling info
- **`production_lines`** - SMT line configurations and status
- **`customers`** - Customer information
- **`assemblies`** - Assembly/part data
- **`users`** - User accounts with role-based permissions
- **`trolley_management`** - Trolley allocation and usage
- **`line_time_blocks`** - Downtime and maintenance tracking

### Key Features
- **Time Multipliers**: Line 1 takes 2x longer than other lines
- **Hand Placement**: 5th line only used when manually specified
- **Validation**: Ship dates after kit dates, positive quantities
- **Audit Trail**: Complete work order history tracking

## 🔧 Usage

### CSV Import
```bash
# Dry run to validate data
python csv_import.py Production_Schedule_Schedule_Table.csv --dry-run

# Import with merge/update logic
python csv_import.py Production_Schedule_Schedule_Table.csv
```

### CSV Export
```bash
# Export work orders
python csv_export.py work_orders

# Export line schedules
python csv_export.py line_schedules

# Full backup
python csv_export.py full_backup
```

### Database Backup
```bash
# Create weekly backup
python scripts/backup.py --create-backup

# Check database health
python scripts/backup.py --db-info
```

## 🌐 API Endpoints

- `GET /health` - Health check
- `GET /api/status` - System status
- `POST /api/init-db` - Manual database initialization
- `GET /api/work-orders` - List work orders
- `GET /api/production-lines` - List production lines

## 📁 Project Structure

```
SMT_DATABASE_01/
├── app.py                 # Flask web application
├── database_schema.sql    # Complete database schema
├── migrations/            # Database migration files
├── seed_data.sql         # Initial data population
├── csv_import.py         # CSV import functionality
├── csv_export.py         # CSV export functionality
├── scripts/              # Utility scripts
│   └── backup.py         # Backup and maintenance
├── docs/                 # Documentation
├── railway.json          # Railway deployment config
├── railway.toml          # Railway environment variables
└── requirements.txt      # Python dependencies
```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `AUTO_INIT_DB` | Auto-initialize database on startup | `true` |
| `CETEC_API_KEY` | Future CETEC ERP integration | Optional |
| `SECRET_KEY` | Flask secret key | Auto-generated |
| `DEBUG` | Debug mode | `false` |

## 📈 Production Line Properties

Each SMT line includes:
- **Basic Info**: Name, ID, type, location
- **Capacity**: Max capacity, time multiplier, setup time
- **Scheduling**: Shifts, hours, days, breaks
- **Status**: Active/inactive, downtime tracking
- **Queue**: Current utilization and next available slot

## 🔄 Deployment Process

1. **GitHub Setup**: Repository with main branch
2. **Railway Connection**: Auto-deploy on push to main
3. **Database Provision**: PostgreSQL automatically created
4. **Schema Initialization**: Runs on first deployment
5. **Data Import**: CSV data loaded via scripts or web interface

## 📚 Documentation

- [Setup Guide](docs/setup.md) - Detailed setup instructions
- [API Reference](docs/api.md) - Complete API documentation
- [Usage Guide](docs/usage.md) - How to use the system
- [Deployment Guide](docs/deployment.md) - Deployment and maintenance
- [SMT Line Properties](SMT_LINE_PROPERTIES.md) - Line configuration details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the documentation
2. Review the deployment logs
3. Contact the development team

## 🔮 Future Enhancements

- **CETEC ERP Integration**: Real-time work order sync
- **Real-time Scheduling**: Live production updates
- **Advanced Analytics**: Performance metrics and reporting
- **Mobile Interface**: Mobile-optimized web app
- **Notification System**: Alerts for schedule changes

---

**Built for low-volume/high-mix electronic manufacturing excellence.** 