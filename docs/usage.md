# Usage Guide

Complete guide for using the SMT Production Schedule Database system.

## Getting Started

### First Time Setup
1. **Access the System**: Visit your Railway deployment URL
2. **Check Health**: Verify system is running at `/health`
3. **Import Data**: Load your initial CSV production schedule
4. **Configure Lines**: Set up production line parameters
5. **Set Up Users**: Create user accounts with appropriate roles

### System Overview
The SMT Production Schedule Database manages:
- **Work Orders**: Production jobs with scheduling information
- **Production Lines**: SMT lines with capacity and status tracking
- **Customers**: Customer information and contact details
- **Assemblies**: Part/assembly specifications
- **Trolley Management**: Equipment allocation and usage
- **Scheduling**: Production timeline and resource allocation

## Daily Operations

### 1. Work Order Management

#### Viewing Work Orders
```bash
# Get all work orders
curl https://your-app.railway.app/api/work-orders

# Filter by status
curl https://your-app.railway.app/api/work-orders?status=scheduled

# Filter by customer
curl https://your-app.railway.app/api/work-orders?customer=Acme%20Electronics

# Filter by date range
curl "https://your-app.railway.app/api/work-orders?date_from=2024-01-20&date_to=2024-01-25"
```

#### Creating Work Orders
```bash
# Create new work order
curl -X POST https://your-app.railway.app/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{
    "wo_number": "WO-2024-003",
    "customer_name": "TechCorp",
    "assembly_name": "PCB-003",
    "quantity": 75,
    "estimated_hours": 5.0,
    "kit_date": "2024-01-25",
    "ship_date": "2024-01-30",
    "production_line_id": 2,
    "setup_time": 45
  }'
```

#### Updating Work Orders
```bash
# Update actual hours after completion
curl -X PUT https://your-app.railway.app/api/work-orders/WO-2024-001 \
  -H "Content-Type: application/json" \
  -d '{
    "actual_hours": 4.2,
    "status": "completed"
  }'
```

### 2. Production Line Management

#### Viewing Line Status
```bash
# Get all production lines
curl https://your-app.railway.app/api/production-lines

# Get specific line
curl https://your-app.railway.app/api/production-lines/1
```

#### Managing Line Status
```bash
# Mark line as down for maintenance
curl -X PUT https://your-app.railway.app/api/production-lines/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "downtime",
    "status_reason": "maintenance",
    "estimated_repair_time": "2024-01-16T14:00:00Z"
  }'

# Reactivate line
curl -X PUT https://your-app.railway.app/api/production-lines/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

### 3. Schedule Management

#### Viewing Schedules
```bash
# Get schedule for date range
curl "https://your-app.railway.app/api/schedule?date_from=2024-01-20&date_to=2024-01-25"

# Get specific line schedule
curl "https://your-app.railway.app/api/schedule/line/1?date_from=2024-01-20&date_to=2024-01-25"
```

#### Understanding Schedule Output
The schedule shows:
- **Daily breakdown** by production line
- **Work order details** with start/end times
- **Setup and run times** for each job
- **Line utilization** percentages
- **Available capacity** for additional work

### 4. Trolley Management

#### Checking Trolley Status
```bash
# Get trolley usage
curl https://your-app.railway.app/api/trolleys

# Filter by date
curl "https://your-app.railway.app/api/trolleys?date=2024-01-20"

# Filter by status
curl "https://your-app.railway.app/api/trolleys?status=available"
```

#### Trolley Allocation
The system automatically tracks:
- **Available trolleys** for new work
- **In-use trolleys** with current assignments
- **Maintenance trolleys** out of service
- **Estimated return times** for planning

## Data Import and Export

### CSV Import Process

#### 1. Prepare Your Data
Ensure your CSV file contains:
- **Work Order Number** (unique identifier)
- **Customer Name** (will be created if new)
- **Assembly Name** (will be created if new)
- **Quantity** (positive number)
- **Estimated Hours** (decimal format)
- **Kit Date** (YYYY-MM-DD format)
- **Ship Date** (YYYY-MM-DD format)
- **Production Line** (optional, will be assigned automatically)
- **Setup Time** (minutes, optional)

#### 2. Validate Data
```bash
# Dry run to check for errors
railway run python csv_import.py Production_Schedule_Schedule_Table.csv --dry-run
```

#### 3. Import Data
```bash
# Import with merge/update logic
railway run python csv_import.py Production_Schedule_Schedule_Table.csv
```

#### 4. Review Results
The import process provides:
- **Total records processed**
- **New records created**
- **Existing records updated**
- **Error count and details**
- **Execution time**

### CSV Export Process

#### Export Types Available
```bash
# Export work orders
python csv_export.py work_orders

# Export line schedules
python csv_export.py line_schedules

# Export trolley usage
python csv_export.py trolley_usage

# Export line performance
python csv_export.py line_performance

# Export customer summary
python csv_export.py customer_summary

# Full backup (all data)
python csv_export.py full_backup
```

#### Filtered Exports
```bash
# Export work orders for specific date range
python csv_export.py work_orders --date-from 2024-01-01 --date-to 2024-01-31

# Export specific line schedule
python csv_export.py line_schedules --line-id 1 --date-from 2024-01-20 --date-to 2024-01-25
```

## Production Line Configuration

### Line Properties

Each production line has these configurable properties:

#### Basic Information
- **Name**: Line identifier (e.g., "Line 1", "SMT-01")
- **Type**: Line type (SMT, Hand Placement, etc.)
- **Location**: Physical location in facility
- **Max Capacity**: Maximum units per hour

#### Time Configuration
- **Time Multiplier**: Relative speed (Line 1 = 2.0x, others = 1.0x)
- **Setup Time**: Default setup time in minutes
- **Shifts per Day**: Number of shifts (default: 1)
- **Hours per Shift**: Hours per shift (default: 8)
- **Days per Week**: Working days (default: 5)
- **Lunch Break**: Break time in minutes (default: 60)

#### Status Management
- **Active/Inactive**: Line availability
- **Downtime Tracking**: Maintenance and malfunction periods
- **Estimated Repair Time**: Expected return to service
- **Status Reason**: Why line is down

### Line-Specific Considerations

#### Line 1 (Slower Line)
- **Time Multiplier**: 2.0 (takes twice as long)
- **Use Case**: Complex assemblies requiring more time
- **Scheduling**: Automatically considered for longer jobs

#### Lines 2-4 (Standard Lines)
- **Time Multiplier**: 1.0 (standard speed)
- **Use Case**: Standard SMT assembly work
- **Scheduling**: Primary lines for most work orders

#### Line 5 (Hand Placement)
- **Type**: Hand Placement
- **Activation**: Manual only (not used in automatic scheduling)
- **Use Case**: Special assemblies requiring manual component placement

## Scheduling Logic

### Automatic Scheduling
The system automatically:
1. **Considers line availability** (active/inactive status)
2. **Applies time multipliers** (Line 1 = 2.0x)
3. **Accounts for setup times** (minimum 30 minutes)
4. **Tracks trolley usage** across all lines
5. **Respects ship dates** (must be after kit dates)
6. **Optimizes line utilization** within capacity limits

### Manual Overrides
You can manually:
- **Assign specific lines** to work orders
- **Adjust setup times** per work order
- **Mark lines inactive** for maintenance
- **Override automatic scheduling** when needed

### Scheduling Constraints
- **Ship dates must be after kit dates**
- **Positive quantities only**
- **Line must be active** for scheduling
- **Trolley availability** considered
- **Line capacity** limits respected

## Best Practices

### Data Management
1. **Regular Backups**: Use weekly backup script
2. **Data Validation**: Always dry-run CSV imports
3. **Consistent Naming**: Use standard formats for WO numbers
4. **Date Formats**: Use YYYY-MM-DD format consistently

### Production Planning
1. **Monitor Line Status**: Check line availability daily
2. **Track Actual Times**: Update actual hours after completion
3. **Plan Maintenance**: Schedule line downtime in advance
4. **Optimize Trolley Usage**: Monitor trolley allocation

### System Maintenance
1. **Health Checks**: Monitor system status regularly
2. **Performance Monitoring**: Check database performance
3. **User Management**: Maintain appropriate access levels
4. **Update Procedures**: Follow deployment guidelines

## Common Workflows

### Daily Production Review
1. **Check Line Status**: Verify all lines are operational
2. **Review Today's Schedule**: Check work order assignments
3. **Monitor Trolley Usage**: Ensure adequate trolley availability
4. **Update Completed Work**: Enter actual hours for finished jobs

### Weekly Planning
1. **Import New Work Orders**: Load updated CSV data
2. **Review Line Performance**: Analyze actual vs estimated times
3. **Plan Maintenance**: Schedule line downtime if needed
4. **Create Backup**: Run weekly backup script

### Monthly Analysis
1. **Export Performance Data**: Generate line performance reports
2. **Analyze Customer Work**: Review customer summary reports
3. **Capacity Planning**: Assess line utilization trends
4. **System Maintenance**: Check database health and performance

## Troubleshooting

### Common Issues

#### Import Errors
- **Date Format**: Ensure dates are YYYY-MM-DD
- **Missing Required Fields**: Check all required columns are present
- **Duplicate WO Numbers**: System will update existing records
- **Invalid Quantities**: Must be positive numbers

#### Scheduling Issues
- **Line Not Available**: Check line status is "active"
- **Trolley Shortage**: Monitor trolley allocation
- **Date Conflicts**: Verify ship dates are after kit dates
- **Capacity Exceeded**: Check line capacity limits

#### System Issues
- **Database Connection**: Check health endpoint
- **Performance**: Monitor response times
- **Access Issues**: Verify user permissions
- **Deployment Problems**: Check Railway logs

### Getting Help
1. **Check Documentation**: Review this guide and API docs
2. **System Status**: Visit `/health` and `/api/status`
3. **Application Logs**: Review Railway deployment logs
4. **Contact Support**: Reach out to development team

## Advanced Features

### API Integration
- **RESTful API**: All functions available via API
- **JSON Responses**: Standardized response format
- **Filtering**: Multiple filter options for queries
- **Pagination**: Large dataset handling

### Automation
- **Auto-deployment**: GitHub integration with Railway
- **Database Initialization**: Automatic schema setup
- **Health Monitoring**: Continuous system monitoring
- **Backup Automation**: Scheduled backup processes

### Future Enhancements
- **CETEC ERP Integration**: Real-time work order sync
- **Real-time Updates**: Live production monitoring
- **Mobile Interface**: Mobile-optimized access
- **Advanced Analytics**: Performance metrics and reporting

## Support and Resources

### Documentation
- **Setup Guide**: `docs/setup.md`
- **API Reference**: `docs/api.md`
- **Deployment Guide**: `docs/deployment.md`
- **SMT Line Properties**: `SMT_LINE_PROPERTIES.md`

### System Information
- **Version**: Check `/api/status` endpoint
- **Uptime**: Monitor system availability
- **Performance**: Track response times
- **Health**: Regular health check monitoring

### Contact Information
For technical support and questions:
- **Development Team**: Contact via project repository
- **Railway Support**: Use Railway dashboard support
- **Documentation**: Check project documentation
- **Issues**: Report via GitHub issues 