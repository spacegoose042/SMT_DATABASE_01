#!/usr/bin/env python3
"""
SMT Production Schedule Database Web Application
Railway deployment application for database initialization and health checks
"""

import os
import psycopg2
import logging
from flask import Flask, jsonify, request
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

def get_database_connection():
    """Get database connection using DATABASE_URL from environment"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        return None
    
    try:
        connection = psycopg2.connect(database_url)
        return connection
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None

def initialize_database():
    """Initialize database schema and seed data"""
    auto_init = os.getenv('AUTO_INIT_DB', 'true').lower() == 'true'
    if not auto_init:
        logger.info("Auto database initialization disabled")
        return True
    
    connection = get_database_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # Check if database is already initialized
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'customers'
            );
        """)
        
        if cursor.fetchone()[0]:
            logger.info("Database already initialized")
            return True
        
        # Read and execute schema file
        schema_file = os.getenv('DB_SCHEMA_FILE', 'database_schema.sql')
        if os.path.exists(schema_file):
            logger.info(f"Executing schema file: {schema_file}")
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
                cursor.execute(schema_sql)
            logger.info("Schema created successfully")
        else:
            logger.error(f"Schema file not found: {schema_file}")
            return False
        
        # Read and execute seed data file
        seed_file = os.getenv('DB_SEED_FILE', 'seed_data.sql')
        if os.path.exists(seed_file):
            logger.info(f"Executing seed data file: {seed_file}")
            try:
                with open(seed_file, 'r') as f:
                    seed_sql = f.read()
                    cursor.execute(seed_sql)
                logger.info("Seed data inserted successfully")
            except Exception as seed_error:
                logger.warning(f"Seed data insertion had issues (this is normal if data already exists): {seed_error}")
                # Continue anyway - this is not critical
        else:
            logger.warning(f"Seed file not found: {seed_file}")
        
        connection.commit()
        logger.info("Database initialization completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        if connection:
            connection.rollback()
        return False
    finally:
        if connection:
            connection.close()

@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'SMT Production Schedule Database API',
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'note': 'React UI will be added in next phase'
    })

@app.route('/api/health')
def api_health():
    """API health check endpoint"""
    try:
        # Test database connection
        connection = get_database_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            connection.close()
            db_status = "healthy"
        else:
            db_status = "unhealthy"
        
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'timestamp': datetime.now().isoformat()
        }), 200 if db_status == "healthy" else 503
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503

@app.route('/health')
def health_check():
    """Health check endpoint for Railway"""
    try:
        # Test database connection
        connection = get_database_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            connection.close()
            db_status = "healthy"
        else:
            db_status = "unhealthy"
        
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'timestamp': datetime.now().isoformat()
        }), 200 if db_status == "healthy" else 503
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503

@app.route('/api/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'api_status': 'operational',
        'database_connected': get_database_connection() is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/init-db')
def manual_init_db():
    """Manual database initialization endpoint"""
    if initialize_database():
        return jsonify({
            'message': 'Database initialized successfully',
            'timestamp': datetime.now().isoformat()
        }), 200
    else:
        return jsonify({
            'message': 'Database initialization failed',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/work-orders')
def get_work_orders():
    """Get all work orders"""
    try:
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT 
                wo.work_order_number,
                c.name as customer_name,
                a.assembly_number,
                a.revision,
                wo.quantity,
                wo.status,
                wo.kit_date,
                wo.ship_date,
                wo.setup_hours_estimated,
                wo.production_time_minutes_estimated,
                wo.production_time_hours_estimated,
                wo.production_time_days_estimated,
                wo.trolley_number,
                pl.line_name,
                wo.line_position,
                wo.created_at,
                wo.updated_at
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN production_lines pl ON wo.line_id = pl.id
            ORDER BY wo.created_at DESC
        """)
        
        work_orders = []
        for row in cursor.fetchall():
            work_orders.append({
                'work_order_number': row[0],
                'customer_name': row[1],
                'assembly_number': row[2],
                'revision': row[3],
                'quantity': row[4],
                'status': row[5],
                'kit_date': row[6].isoformat() if row[6] else None,
                'ship_date': row[7].isoformat() if row[7] else None,
                'setup_hours_estimated': float(row[8]) if row[8] else None,
                'production_time_minutes_estimated': float(row[9]) if row[9] else None,
                'production_time_hours_estimated': float(row[10]) if row[10] else None,
                'production_time_days_estimated': float(row[11]) if row[11] else None,
                'trolley_number': row[12],
                'line_name': row[13],
                'line_position': row[14],
                'created_at': row[15].isoformat(),
                'updated_at': row[16].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'work_orders': work_orders,
            'total_count': len(work_orders),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching work orders: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/customers')
def get_customers():
    """Get all customers"""
    try:
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT id, name, created_at, updated_at
            FROM customers
            WHERE active = true
            ORDER BY name
        """)
        
        customers = []
        for row in cursor.fetchall():
            customers.append({
                'id': row[0],
                'name': row[1],
                'created_at': row[2].isoformat(),
                'updated_at': row[3].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'customers': customers,
            'total_count': len(customers),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching customers: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/production-lines')
def get_production_lines():
    """Get all production lines"""
    try:
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT id, line_name, time_multiplier, active, shifts_per_day, 
                   hours_per_shift, days_per_week, created_at, updated_at
            FROM production_lines
            ORDER BY line_name
        """)
        
        lines = []
        for row in cursor.fetchall():
            lines.append({
                'id': row[0],
                'line_name': row[1],
                'time_multiplier': float(row[2]) if row[2] else 1.0,
                'active': row[3],
                'shifts_per_day': row[4],
                'hours_per_shift': row[5],
                'days_per_week': row[6],
                'created_at': row[7].isoformat(),
                'updated_at': row[8].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'production_lines': lines,
            'total_count': len(lines),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching production lines: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/schedule/timeline')
def get_schedule_timeline():
    """Get timeline view of all work orders scheduled across production lines"""
    try:
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        # Get work orders with their line assignments and estimated times
        cursor.execute("""
            SELECT 
                wo.id,
                wo.work_order_number,
                c.name as customer_name,
                a.assembly_number,
                a.revision,
                wo.quantity,
                wo.status,
                wo.kit_date,
                wo.ship_date,
                wo.setup_hours_estimated,
                wo.production_time_hours_estimated,
                wo.production_time_days_estimated,
                wo.trolley_number,
                pl.id as line_id,
                pl.line_name,
                pl.time_multiplier,
                wo.line_position,
                wo.scheduled_start_time,
                wo.scheduled_end_time,
                wo.created_at,
                wo.updated_at
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN production_lines pl ON wo.line_id = pl.id
            WHERE wo.status NOT IN ('Completed', 'Cancelled')
            ORDER BY pl.line_name, wo.line_position, wo.scheduled_start_time NULLS LAST
        """)
        
        work_orders = []
        for row in cursor.fetchall():
            # Calculate duration in hours (accounting for line multiplier)
            setup_hours = float(row[9]) if row[9] else 1.0
            production_hours = float(row[10]) if row[10] else 0.0
            time_multiplier = float(row[15]) if row[15] else 1.0
            
            total_duration_hours = setup_hours + (production_hours * time_multiplier)
            
            work_orders.append({
                'id': row[0],
                'work_order_number': row[1],
                'customer_name': row[2],
                'assembly_number': row[3],
                'revision': row[4],
                'quantity': row[5],
                'status': row[6],
                'kit_date': row[7].isoformat() if row[7] else None,
                'ship_date': row[8].isoformat() if row[8] else None,
                'setup_hours_estimated': setup_hours,
                'production_hours_estimated': production_hours,
                'total_duration_hours': total_duration_hours,
                'trolley_number': row[12],
                'line_id': row[13],
                'line_name': row[14],
                'time_multiplier': time_multiplier,
                'line_position': row[16],
                'scheduled_start_time': row[17].isoformat() if row[17] else None,
                'scheduled_end_time': row[18].isoformat() if row[18] else None,
                'created_at': row[19].isoformat(),
                'updated_at': row[20].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'work_orders': work_orders,
            'total_count': len(work_orders),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching schedule timeline: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/schedule/line/<line_id>')
def get_line_schedule(line_id):
    """Get schedule for a specific production line (for floor displays)"""
    try:
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        # Get line info
        cursor.execute("""
            SELECT id, line_name, time_multiplier, active
            FROM production_lines 
            WHERE id = %s
        """, (line_id,))
        
        line_info = cursor.fetchone()
        if not line_info:
            return jsonify({'error': 'Production line not found'}), 404
        
        # Get current and next jobs for this line
        cursor.execute("""
            SELECT 
                wo.id,
                wo.work_order_number,
                c.name as customer_name,
                a.assembly_number,
                a.revision,
                wo.quantity,
                wo.status,
                wo.setup_hours_estimated,
                wo.production_time_hours_estimated,
                wo.trolley_number,
                wo.line_position,
                wo.scheduled_start_time,
                wo.scheduled_end_time,
                wo.ship_date
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            WHERE wo.line_id = %s 
            AND wo.status NOT IN ('Completed', 'Cancelled')
            ORDER BY wo.line_position, wo.scheduled_start_time NULLS LAST
            LIMIT 3
        """, (line_id,))
        
        jobs = []
        for i, row in enumerate(cursor.fetchall()):
            setup_hours = float(row[7]) if row[7] else 1.0
            production_hours = float(row[8]) if row[8] else 0.0
            time_multiplier = float(line_info[2]) if line_info[2] else 1.0
            
            total_duration_hours = setup_hours + (production_hours * time_multiplier)
            
            jobs.append({
                'id': row[0],
                'work_order_number': row[1],
                'customer_name': row[2],
                'assembly_number': row[3],
                'revision': row[4],
                'quantity': row[5],
                'status': row[6],
                'setup_hours_estimated': setup_hours,
                'production_hours_estimated': production_hours,
                'total_duration_hours': total_duration_hours,
                'trolley_number': row[9],
                'line_position': row[10],
                'scheduled_start_time': row[11].isoformat() if row[11] else None,
                'scheduled_end_time': row[12].isoformat() if row[12] else None,
                'ship_date': row[13].isoformat() if row[13] else None,
                'position_label': 'CURRENT' if i == 0 else f'NEXT {i}'
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'line_info': {
                'id': line_info[0],
                'line_name': line_info[1],
                'time_multiplier': float(line_info[2]) if line_info[2] else 1.0,
                'active': line_info[3]
            },
            'jobs': jobs,
            'total_count': len(jobs),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching line schedule: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/import-csv', methods=['POST'])
def import_csv():
    """Import CSV data endpoint"""
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({
                'error': 'No file uploaded',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'error': 'No file selected',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Save uploaded file temporarily
        temp_file_path = f"/tmp/{file.filename}"
        file.save(temp_file_path)
        
        # Import CSV using our existing script
        from csv_import import CSVImporter
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return jsonify({
                'error': 'DATABASE_URL not configured',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        importer = CSVImporter(database_url)
        importer.connect()
        
        # Check if this is a dry run
        dry_run = request.form.get('dry_run', 'false').lower() == 'true'
        
        if dry_run:
            # Just validate the CSV structure
            import csv
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                # Skip the first 5 rows (configuration data)
                for _ in range(5):
                    next(f)
                
                reader = csv.DictReader(f)
                headers = reader.fieldnames
                # Count only rows with actual data
                row_count = sum(1 for row in reader if row.get('Customer') and row.get('WO'))
            
            return jsonify({
                'message': 'CSV validation completed',
                'headers': headers,
                'row_count': row_count,
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            # Import the data
            stats = importer.import_csv(temp_file_path)
            
            return jsonify({
                'message': 'CSV import completed',
                'stats': stats,
                'timestamp': datetime.now().isoformat()
            }), 200
            
    except Exception as e:
        logger.error(f"CSV import error: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        # Clean up temp file
        if 'temp_file_path' in locals():
            try:
                os.remove(temp_file_path)
            except:
                pass

if __name__ == '__main__':
    # Initialize database on startup (only if AUTO_INIT_DB is set)
    logger.info("Starting SMT Production Schedule Database application")
    
    auto_init = os.getenv('AUTO_INIT_DB', 'false').lower() == 'true'
    if auto_init:
        logger.info("Auto-initialization enabled, attempting database setup...")
        init_result = initialize_database()
        if init_result:
            logger.info("Database initialization successful")
        else:
            logger.warning("Database initialization had issues, but continuing...")
    else:
        logger.info("Auto-initialization disabled, skipping database setup")
    
    # Get port from environment (Railway sets PORT)
    port = int(os.getenv('PORT', 5000))
    
    # Start Flask application
    app.run(host='0.0.0.0', port=port, debug=False) 