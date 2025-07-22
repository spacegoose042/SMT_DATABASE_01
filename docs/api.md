# API Reference

Complete API documentation for the SMT Production Schedule Database.

## Base URL

- **Production**: `https://your-railway-app.railway.app`
- **Local Development**: `http://localhost:5000`

## Authentication

Currently, the API uses basic authentication. Future versions will support:
- API key authentication
- JWT tokens
- Role-based access control

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Health and Status Endpoints

### GET /health

Health check endpoint for Railway deployment monitoring.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "message": "Service is healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Service is healthy
- `503` - Service is unhealthy (database connection issues)

### GET /api/status

Detailed system status and database information.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "database": {
      "connected": true,
      "tables": {
        "work_orders": 1250,
        "production_lines": 5,
        "customers": 45,
        "assemblies": 320
      },
      "last_backup": "2024-01-14T23:00:00Z"
    },
    "version": "1.0.0",
    "uptime": "2 days, 5 hours, 30 minutes"
  },
  "message": "System status retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Database Management Endpoints

### POST /api/init-db

Manually initialize the database schema and seed data.

**Request Body:**
```json
{
  "force": false,
  "seed_data": true
}
```

**Parameters:**
- `force` (boolean, optional): Force re-initialization even if tables exist
- `seed_data` (boolean, optional): Include seed data in initialization

**Response:**
```json
{
  "success": true,
  "data": {
    "tables_created": 9,
    "seed_records": 25,
    "execution_time": "2.3s"
  },
  "message": "Database initialized successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Database initialized successfully
- `400` - Invalid parameters
- `500` - Database initialization failed

## Work Order Endpoints

### GET /api/work-orders

Retrieve work orders with optional filtering and pagination.

**Query Parameters:**
- `status` (string, optional): Filter by work order status
- `customer` (string, optional): Filter by customer name
- `line` (integer, optional): Filter by production line ID
- `date_from` (date, optional): Filter by start date (YYYY-MM-DD)
- `date_to` (date, optional): Filter by end date (YYYY-MM-DD)
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Records per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "work_orders": [
      {
        "id": 1,
        "wo_number": "WO-2024-001",
        "customer_name": "Acme Electronics",
        "assembly_name": "PCB-001",
        "quantity": 100,
        "estimated_hours": 4.5,
        "actual_hours": null,
        "kit_date": "2024-01-20",
        "ship_date": "2024-01-25",
        "status": "scheduled",
        "production_line_id": 2,
        "setup_time": 30,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "pages": 25
    }
  },
  "message": "Work orders retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/work-orders/{wo_number}

Retrieve a specific work order by work order number.

**Path Parameters:**
- `wo_number` (string): Work order number (e.g., "WO-2024-001")

**Response:**
```json
{
  "success": true,
  "data": {
    "work_order": {
      "id": 1,
      "wo_number": "WO-2024-001",
      "customer_name": "Acme Electronics",
      "assembly_name": "PCB-001",
      "quantity": 100,
      "estimated_hours": 4.5,
      "actual_hours": null,
      "kit_date": "2024-01-20",
      "ship_date": "2024-01-25",
      "status": "scheduled",
      "production_line_id": 2,
      "setup_time": 30,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Work order retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /api/work-orders

Create a new work order.

**Request Body:**
```json
{
  "wo_number": "WO-2024-002",
  "customer_name": "TechCorp",
  "assembly_name": "PCB-002",
  "quantity": 50,
  "estimated_hours": 3.0,
  "kit_date": "2024-01-22",
  "ship_date": "2024-01-27",
  "production_line_id": 1,
  "setup_time": 45
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "work_order": {
      "id": 2,
      "wo_number": "WO-2024-002",
      "customer_name": "TechCorp",
      "assembly_name": "PCB-002",
      "quantity": 50,
      "estimated_hours": 3.0,
      "actual_hours": null,
      "kit_date": "2024-01-22",
      "ship_date": "2024-01-27",
      "status": "scheduled",
      "production_line_id": 1,
      "setup_time": 45,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Work order created successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### PUT /api/work-orders/{wo_number}

Update an existing work order.

**Path Parameters:**
- `wo_number` (string): Work order number

**Request Body:**
```json
{
  "actual_hours": 4.2,
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "work_order": {
      "id": 1,
      "wo_number": "WO-2024-001",
      "actual_hours": 4.2,
      "status": "completed",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Work order updated successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Production Line Endpoints

### GET /api/production-lines

Retrieve all production lines with their current status.

**Response:**
```json
{
  "success": true,
  "data": {
    "production_lines": [
      {
        "id": 1,
        "name": "Line 1",
        "line_type": "SMT",
        "location": "Building A",
        "max_capacity": 100,
        "time_multiplier": 2.0,
        "setup_time": 30,
        "current_utilization": 85,
        "status": "active",
        "status_reason": null,
        "downtime_start": null,
        "downtime_end": null,
        "estimated_repair_time": null,
        "shifts_per_day": 1,
        "hours_per_shift": 8,
        "days_per_week": 5,
        "lunch_break_minutes": 60,
        "skill_level": "standard",
        "queue_length": 5,
        "next_available_slot": "2024-01-16T08:00:00Z"
      }
    ]
  },
  "message": "Production lines retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/production-lines/{line_id}

Retrieve a specific production line.

**Path Parameters:**
- `line_id` (integer): Production line ID

**Response:**
```json
{
  "success": true,
  "data": {
    "production_line": {
      "id": 1,
      "name": "Line 1",
      "line_type": "SMT",
      "location": "Building A",
      "max_capacity": 100,
      "time_multiplier": 2.0,
      "setup_time": 30,
      "current_utilization": 85,
      "status": "active",
      "status_reason": null,
      "downtime_start": null,
      "downtime_end": null,
      "estimated_repair_time": null,
      "shifts_per_day": 1,
      "hours_per_shift": 8,
      "days_per_week": 5,
      "lunch_break_minutes": 60,
      "skill_level": "standard",
      "queue_length": 5,
      "next_available_slot": "2024-01-16T08:00:00Z"
    }
  },
  "message": "Production line retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### PUT /api/production-lines/{line_id}/status

Update production line status (active/inactive/downtime).

**Path Parameters:**
- `line_id` (integer): Production line ID

**Request Body:**
```json
{
  "status": "downtime",
  "status_reason": "maintenance",
  "estimated_repair_time": "2024-01-16T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "production_line": {
      "id": 1,
      "status": "downtime",
      "status_reason": "maintenance",
      "downtime_start": "2024-01-15T10:30:00Z",
      "estimated_repair_time": "2024-01-16T14:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Production line status updated successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Schedule Endpoints

### GET /api/schedule

Retrieve production schedule for specified date range.

**Query Parameters:**
- `date_from` (date, required): Start date (YYYY-MM-DD)
- `date_to` (date, required): End date (YYYY-MM-DD)
- `line_id` (integer, optional): Filter by specific production line

**Response:**
```json
{
  "success": true,
  "data": {
    "schedule": [
      {
        "date": "2024-01-20",
        "line_id": 1,
        "line_name": "Line 1",
        "work_orders": [
          {
            "wo_number": "WO-2024-001",
            "customer_name": "Acme Electronics",
            "assembly_name": "PCB-001",
            "start_time": "08:00",
            "end_time": "12:30",
            "setup_time": 30,
            "run_time": 240
          }
        ],
        "total_hours": 4.5,
        "utilization": 85
      }
    ]
  },
  "message": "Schedule retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/schedule/line/{line_id}

Retrieve detailed schedule for a specific production line.

**Path Parameters:**
- `line_id` (integer): Production line ID

**Query Parameters:**
- `date_from` (date, optional): Start date (YYYY-MM-DD)
- `date_to` (date, optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "line": {
      "id": 1,
      "name": "Line 1",
      "status": "active"
    },
    "schedule": [
      {
        "date": "2024-01-20",
        "work_orders": [
          {
            "wo_number": "WO-2024-001",
            "start_time": "08:00",
            "end_time": "12:30",
            "setup_time": 30,
            "run_time": 240
          }
        ],
        "total_hours": 4.5,
        "available_hours": 8.0,
        "utilization": 56.25
      }
    ]
  },
  "message": "Line schedule retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Trolley Management Endpoints

### GET /api/trolleys

Retrieve trolley usage and availability.

**Query Parameters:**
- `date` (date, optional): Specific date (YYYY-MM-DD)
- `status` (string, optional): Filter by status (available, in_use, maintenance)

**Response:**
```json
{
  "success": true,
  "data": {
    "trolleys": [
      {
        "id": 1,
        "trolley_number": "T001",
        "status": "in_use",
        "current_line_id": 2,
        "current_wo_number": "WO-2024-001",
        "assigned_at": "2024-01-15T08:00:00Z",
        "estimated_return": "2024-01-15T16:00:00Z"
      }
    ],
    "summary": {
      "total_trolleys": 20,
      "available": 15,
      "in_use": 4,
      "maintenance": 1
    }
  },
  "message": "Trolley information retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Customer Endpoints

### GET /api/customers

Retrieve all customers.

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "Acme Electronics",
        "contact_person": "John Smith",
        "email": "john@acme.com",
        "phone": "555-0123",
        "address": "123 Main St, City, State",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "message": "Customers retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Assembly Endpoints

### GET /api/assemblies

Retrieve all assemblies.

**Response:**
```json
{
  "success": true,
  "data": {
    "assemblies": [
      {
        "id": 1,
        "name": "PCB-001",
        "description": "Main control board",
        "part_number": "PCB-001-REV-A",
        "revision": "A",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "message": "Assemblies retrieved successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Data Import/Export Endpoints

### POST /api/import/csv

Import work orders from CSV file.

**Request Body:**
```json
{
  "file_path": "Production_Schedule_Schedule_Table.csv",
  "dry_run": false,
  "update_existing": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "import_stats": {
      "total_records": 150,
      "created": 120,
      "updated": 30,
      "errors": 0,
      "execution_time": "5.2s"
    },
    "errors": []
  },
  "message": "CSV import completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/export/csv

Export data to CSV format.

**Query Parameters:**
- `type` (string, required): Export type (work_orders, line_schedules, trolley_usage, line_performance, customer_summary, full_backup)
- `date_from` (date, optional): Start date for filtered exports
- `date_to` (date, optional): End date for filtered exports
- `line_id` (integer, optional): Filter by production line

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "/downloads/export_20240115_103000.csv",
    "file_size": "2.5MB",
    "record_count": 1250
  },
  "message": "Export completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid parameters or data |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource not found |
| `409` | Conflict - Resource already exists |
| `422` | Unprocessable Entity - Validation failed |
| `500` | Internal Server Error - Server error |
| `503` | Service Unavailable - Database unavailable |

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Burst**: 200 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Versioning

API versioning is handled through URL path:
- Current version: `/api/v1/` (default)
- Future versions: `/api/v2/`, `/api/v3/`, etc.

## SDK and Examples

### Python Example
```python
import requests

# Get work orders
response = requests.get('https://your-app.railway.app/api/work-orders')
work_orders = response.json()['data']['work_orders']

# Create work order
new_wo = {
    "wo_number": "WO-2024-003",
    "customer_name": "NewCorp",
    "assembly_name": "PCB-003",
    "quantity": 75,
    "estimated_hours": 5.0,
    "kit_date": "2024-01-25",
    "ship_date": "2024-01-30"
}

response = requests.post('https://your-app.railway.app/api/work-orders', json=new_wo)
```

### cURL Examples
```bash
# Health check
curl https://your-app.railway.app/health

# Get work orders
curl https://your-app.railway.app/api/work-orders

# Create work order
curl -X POST https://your-app.railway.app/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{"wo_number": "WO-2024-003", "customer_name": "NewCorp"}'
```

## Support

For API support:
1. Check the error messages in responses
2. Verify request format and parameters
3. Check system status at `/health`
4. Review application logs
5. Contact the development team 