#!/usr/bin/env python3
"""
SMT Production Schedule Database Web Application
Railway deployment application for database initialization and health checks
"""

import os
import psycopg2
import logging
import jwt
import bcrypt
from functools import wraps
from flask import Flask, jsonify, request, Response
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime, timedelta
from flask_cors import CORS
import json
import time
import threading
from queue import Queue

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure CORS for REST endpoints and SSE
CORS(app, resources={
    r"/api/*": {"origins": "*"}
})

# Initialize Socket.IO with CORS support
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Global queue for real-time updates
update_queue = Queue()
connected_clients = set()

# Enhanced Room Management for Phase 3
room_users = {}  # Track users in each room: {room_name: {sid: user_info}}
user_sessions = {}  # Track user sessions: {sid: {user_info, rooms}}

# JWT configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'smt-production-database-secret-key-change-in-production')
app.config['JWT_EXPIRATION_DELTA'] = timedelta(hours=24)

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

# Authentication helper functions
def hash_password(password):
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, password_hash):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_jwt_token(user_id, username, role):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + app.config['JWT_EXPIRATION_DELTA'],
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def decode_jwt_token(token):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(required_roles=None):
    """Decorator to require authentication and optionally specific roles"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            
            # Get token from Authorization header
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                try:
                    token = auth_header.split(' ')[1]  # Bearer <token>
                except IndexError:
                    pass
            
            if not token:
                return jsonify({'error': 'Authentication token required'}), 401
            
            # Decode token
            payload = decode_jwt_token(token)
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Check role if required
            if required_roles and payload.get('role') not in required_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            # Add user info to request context
            request.current_user = {
                'user_id': payload['user_id'],
                'username': payload['username'],
                'role': payload['role']
            }
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def create_default_users():
    """Create default users if they don't exist"""
    try:
        connection = get_database_connection()
        if not connection:
            return False
        
        cursor = connection.cursor()
        
        # Check if any users exist
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        if user_count > 0:
            logger.info("Users already exist, skipping default user creation")
            cursor.close()
            connection.close()
            return True
        
        # Create default admin user
        admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
        admin_hash = hash_password(admin_password)
        
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, active)
            VALUES (%s, %s, %s, %s, %s)
        """, ('admin', 'admin@smt.local', admin_hash, 'admin', True))
        
        # Create default scheduler user
        scheduler_password = os.getenv('SCHEDULER_PASSWORD', 'scheduler123')
        scheduler_hash = hash_password(scheduler_password)
        
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, active)
            VALUES (%s, %s, %s, %s, %s)
        """, ('scheduler', 'scheduler@smt.local', scheduler_hash, 'scheduler', True))
        
        # Create default supervisor user
        supervisor_password = os.getenv('SUPERVISOR_PASSWORD', 'supervisor123')
        supervisor_hash = hash_password(supervisor_password)
        
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, active)
            VALUES (%s, %s, %s, %s, %s)
        """, ('supervisor', 'supervisor@smt.local', supervisor_hash, 'supervisor', True))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        logger.info("Default users created successfully")
        logger.info(f"Admin user: admin / {admin_password}")
        logger.info(f"Scheduler user: scheduler / {scheduler_password}")
        logger.info(f"Supervisor user: supervisor / {supervisor_password}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to create default users: {e}")
        return False

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
        
        # Create default users
        cursor.close()  # Close cursor before calling create_default_users
        if not create_default_users():
            logger.warning("Failed to create default users, but continuing...")
        
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
def api_info():
    """API information endpoint"""
    return jsonify({
        'message': 'SMT Production Schedule Database API',
        'status': 'running',
        'version': '2.3.0',
        'note': 'API-only backend with JWT authentication and mobile support - React runs locally for development',
        'endpoints': {
            'health': '/api/health',
            'auth_login': '/api/auth/login',
            'auth_me': '/api/auth/me', 
            'users': '/api/users',
            'timeline': '/api/schedule/timeline', 
            'work_orders': '/api/work-orders',
            'production_lines': '/api/production-lines',
            'mobile_search': '/api/mobile/work-orders/search',
            'mobile_update_status': '/api/mobile/work-orders/{id}/status',
            'mobile_statuses': '/api/mobile/statuses',
            'mobile_qr_lookup': '/api/mobile/qr/{qr_code}'
        },
        'auth': {
            'default_users': {
                'admin': 'admin123',
                'scheduler': 'scheduler123', 
                'supervisor': 'supervisor123'
            }
        },
        'mobile_features': {
            'work_order_search': 'Search by WO number, customer, or assembly',
            'status_updates': 'Update work order status with notes',
            'status_history': 'Track all status changes with timestamps',
            'role_based_access': 'Floor workers can view, supervisors+ can update'
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/test')
def test_endpoint():
    """Simple test endpoint to verify deployment"""
    return jsonify({
        'message': 'Test endpoint working',
        'version': '2.1.0',
        'timeline_available': True,
        'timestamp': datetime.now().isoformat()
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

# Authentication endpoints
@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password required'}), 400
        
        username = data['username'].strip()
        password = data['password']
        
        # Get user from database
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, username, email, password_hash, role, active 
            FROM users 
            WHERE username = %s AND active = true
        """, (username,))
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user or not verify_password(password, user[3]):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Generate JWT token
        token = generate_jwt_token(str(user[0]), user[1], user[4])
        
        return jsonify({
            'token': token,
            'user': {
                'id': str(user[0]),
                'username': user[1],
                'email': user[2],
                'role': user[4]
            },
            'message': 'Login successful',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'error': 'Login failed',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/auth/me')
@require_auth()
def get_current_user():
    """Get current user information"""
    try:
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, username, email, role, active, created_at 
            FROM users 
            WHERE id = %s AND active = true
        """, (request.current_user['user_id'],))
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': str(user[0]),
                'username': user[1],
                'email': user[2],
                'role': user[3],
                'active': user[4],
                'created_at': user[5].isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        return jsonify({
            'error': 'Failed to get user information',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/users')
@require_auth(['admin'])
def get_users():
    """Get all users (admin only)"""
    try:
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        cursor.execute("""
            SELECT id, username, email, role, active, created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
        """)
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': str(row[0]),
                'username': row[1],
                'email': row[2],
                'role': row[3],
                'active': row[4],
                'created_at': row[5].isoformat(),
                'updated_at': row[6].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'users': users,
            'total_count': len(users),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get users error: {e}")
        return jsonify({
            'error': 'Failed to get users',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/users', methods=['POST'])
@require_auth(['admin'])
def create_user():
    """Create new user (admin only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data required'}), 400
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        username = data['username'].strip()
        email = data['email'].strip()
        password = data['password']
        role = data['role']
        
        # Validate role
        valid_roles = ['admin', 'scheduler', 'supervisor', 'floor_view', 'viewer']
        if role not in valid_roles:
            return jsonify({'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'}), 400
        
        # Hash password
        password_hash = hash_password(password)
        
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Check if username or email already exists
        cursor.execute("""
            SELECT id FROM users WHERE username = %s OR email = %s
        """, (username, email))
        
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': 'Username or email already exists'}), 409
        
        # Create user
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, active)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, username, email, role, active, created_at
        """, (username, email, password_hash, role, True))
        
        user = cursor.fetchone()
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'user': {
                'id': str(user[0]),
                'username': user[1],
                'email': user[2],
                'role': user[3],
                'active': user[4],
                'created_at': user[5].isoformat()
            },
            'message': 'User created successfully',
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except psycopg2.IntegrityError as e:
        logger.error(f"User creation integrity error: {e}")
        return jsonify({
            'error': 'Username or email already exists',
            'timestamp': datetime.now().isoformat()
        }), 409
    except Exception as e:
        logger.error(f"Create user error: {e}")
        return jsonify({
            'error': 'Failed to create user',
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
    """Get timeline view of all work orders organized by production lines"""
    try:
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        # Use the same query structure as /api/work-orders (which works)
        cursor.execute("""
            SELECT 
                wo.id,
                wo.work_order_number,
                wo.line_number,
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
            WHERE wo.status NOT IN ('Completed', 'Cancelled')
            ORDER BY pl.line_name NULLS LAST, wo.line_position NULLS LAST
        """)
        
        work_orders = []
        for row in cursor.fetchall():
            # Calculate total duration in hours (indices shifted due to line_number)
            setup_hours = float(row[10]) if row[10] else 0.0
            prod_minutes = float(row[11]) if row[11] else 0.0
            prod_hours = float(row[12]) if row[12] else 0.0
            prod_days = float(row[13]) if row[13] else 0.0
            
            total_hours = setup_hours + (prod_minutes / 60.0) + prod_hours + (prod_days * 8.0)
            
            # Generate QR code if line_number is available
            qr_code = None
            if row[2] is not None:  # line_number
                qr_code = f"{row[1]}-{row[2]}"  # work_order_number-line_number
            
            work_orders.append({
                'id': row[0],
                'work_order_number': row[1],
                'line_number': row[2],
                'qr_code': qr_code,
                'customer_name': row[3],
                'assembly_number': row[4],
                'revision': row[5],
                'quantity': row[6],
                'status': row[7],
                'kit_date': row[8].isoformat() if row[8] else None,
                'ship_date': row[9].isoformat() if row[9] else None,
                'setup_hours_estimated': setup_hours,
                'production_hours_estimated': prod_hours,
                'total_duration_hours': total_hours,
                'trolley_number': row[14],
                'line_name': row[15],
                'line_position': row[16],
                'scheduled_start_time': None,  # Not yet implemented
                'scheduled_end_time': None,    # Not yet implemented
            })
        
        return jsonify({
            'timeline': work_orders,
            'work_orders': work_orders,  # For compatibility
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Timeline error: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        if connection:
            connection.close()

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
                wo.ship_date
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            WHERE wo.line_id = %s 
            AND wo.status NOT IN ('Completed', 'Cancelled')
            ORDER BY wo.line_position NULLS LAST, wo.created_at
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
                'scheduled_start_time': None,  # Not yet implemented
                'scheduled_end_time': None,    # Not yet implemented
                'ship_date': row[11].isoformat() if row[11] else None,
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

# Temporary endpoint for creating admin user (remove after initial setup)
@app.route('/api/init-admin', methods=['POST'])
def init_admin_user():
    """Create initial admin user - temporary endpoint for setup"""
    try:
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Check if admin user already exists
        cursor.execute("SELECT id FROM users WHERE username = 'admin'")
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'message': 'Admin user already exists'}), 200
        
        # Create admin user
        admin_password = 'admin123'
        admin_hash = hash_password(admin_password)
        
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, active)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, username, email, role
        """, ('admin', 'admin@smt.local', admin_hash, 'admin', True))
        
        user = cursor.fetchone()
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': 'Admin user created successfully',
            'user': {
                'id': str(user[0]),
                'username': user[1], 
                'email': user[2],
                'role': user[3]
            },
            'credentials': {
                'username': 'admin',
                'password': 'admin123'
            },
            'timestamp': datetime.now().isoformat()
        }), 201
        
    except Exception as e:
        logger.error(f"Init admin error: {e}")
        return jsonify({
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# Mobile Status Update Endpoints
@app.route('/api/mobile/work-orders/search')
@require_auth(['admin', 'scheduler', 'supervisor', 'floor_view'])
def mobile_search_work_orders():
    """Search work orders for mobile interface - simplified response"""
    try:
        # Get search parameters
        query = request.args.get('q', '').strip()
        line_id = request.args.get('line_id')
        status = request.args.get('status')
        limit = min(int(request.args.get('limit', 20)), 50)  # Max 50 results for mobile
        
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Build search query
        where_conditions = ["wo.status NOT IN ('Completed', 'Cancelled')"]
        params = []
        
        if query:
            where_conditions.append("""(
                wo.work_order_number ILIKE %s OR 
                c.name ILIKE %s OR 
                a.assembly_number ILIKE %s
            )""")
            search_term = f'%{query}%'
            params.extend([search_term, search_term, search_term])
        
        if line_id:
            where_conditions.append("wo.line_id = %s")
            params.append(line_id)
            
        if status:
            where_conditions.append("wo.status = %s")
            params.append(status)
        
        where_clause = " AND ".join(where_conditions)
        
        cursor.execute(f"""
            SELECT 
                wo.id,
                wo.work_order_number,
                wo.line_number,
                c.name as customer_name,
                a.assembly_number,
                wo.quantity,
                wo.status,
                pl.line_name,
                wo.trolley_number,
                wo.ship_date,
                wo.updated_at
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN production_lines pl ON wo.line_id = pl.id
            WHERE {where_clause}
            ORDER BY wo.updated_at DESC
            LIMIT %s
        """, params + [limit])
        
        work_orders = []
        for row in cursor.fetchall():
            # Compute QR code if line_number is available
            qr_code = None
            if row[2] is not None:  # line_number
                qr_code = f"{row[1]}-{row[2]}"  # work_order_number-line_number
            
            work_orders.append({
                'id': row[0],
                'work_order_number': row[1],
                'line_number': row[2],
                'qr_code': qr_code,
                'customer_name': row[3],
                'assembly_number': row[4],
                'quantity': row[5],
                'status': row[6],
                'line_name': row[7],
                'trolley_number': row[8],
                'ship_date': row[9].isoformat() if row[9] else None,
                'last_updated': row[10].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'work_orders': work_orders,
            'count': len(work_orders),
            'search_query': query,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Mobile search error: {e}")
        return jsonify({
            'error': 'Search failed',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/mobile/work-orders/<work_order_id>/status', methods=['PUT'])
@require_auth(['admin', 'scheduler', 'supervisor'])
def mobile_update_work_order_status(work_order_id):
    """Update work order status from mobile device"""
    try:
        data = request.get_json()
        if not data or not data.get('status'):
            return jsonify({'error': 'Status is required'}), 400
        
        new_status = data['status'].strip()
        notes = data.get('notes', '').strip()
        updated_by = request.current_user['username']
        
        # Validate status
        valid_statuses = [
            '1st Side Ready', 'Ready', 'Ready*', 'In Progress', 
            'Setup', 'Running', 'Completed', 'On Hold', 'Issues',
            'Missing TSM-125-01-L-DV', 'Quality Check', 'Cancelled'
        ]
        
        if new_status not in valid_statuses:
            return jsonify({
                'error': f'Invalid status. Valid options: {", ".join(valid_statuses)}'
            }), 400
        
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        try:
            cursor = connection.cursor()
            
            # Get current work order
            cursor.execute("""
                SELECT wo.work_order_number, wo.status, c.name, a.assembly_number, wo.line_number
                FROM work_orders wo
                JOIN assemblies a ON wo.assembly_id = a.id
                JOIN customers c ON a.customer_id = c.id
                WHERE wo.id = %s
            """, (work_order_id,))
            
            work_order = cursor.fetchone()
            if not work_order:
                cursor.close()
                connection.close()
                return jsonify({'error': 'Work order not found'}), 404
            
            old_status = work_order[1]
            line_number = work_order[4] # Get line_number from the work_order tuple
            
            # Update work order status
            cursor.execute("""
                UPDATE work_orders 
                SET status = %s, updated_at = NOW()
                WHERE id = %s
            """, (new_status, work_order_id))
            
            # Create status history record
            cursor.execute("""
                INSERT INTO work_order_status_history 
                (work_order_id, old_status, new_status, changed_by, notes, changed_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (work_order_id, old_status, new_status, updated_by, notes))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            # Prepare work order data for broadcast
            work_order_broadcast_data = {
                'id': work_order_id,
                'work_order_number': work_order[0],
                'qr_code': f"{work_order[0]}-{line_number}" if line_number else None,
                'customer_name': work_order[2],
                'assembly_number': work_order[3],
                'line_name': None,  # We could fetch this if needed
                'line_number': line_number,
                'quantity': None,  # We could fetch this if needed
                'trolley_number': None  # We could fetch this if needed
            }
            
            # Broadcast the status update to connected clients
            broadcast_status_update(work_order_broadcast_data, old_status, new_status, updated_by)
            
            return jsonify({
                'message': 'Status updated successfully',
                'work_order_number': work_order[0],
                'old_status': old_status,
                'new_status': new_status,
                'updated_by': updated_by,
                'notes': notes,
                'broadcast': 'sent',
                'timestamp': datetime.now().isoformat()
            }), 200
            
        except Exception as db_error:
            logger.error(f"Database error in mobile status update: {db_error}")
            if connection:
                connection.rollback()
                connection.close()
            return jsonify({
                'error': f'Database operation failed: {str(db_error)}',
                'timestamp': datetime.now().isoformat()
            }), 500
        
    except Exception as e:
        logger.error(f"Mobile status update error: {e}")
        return jsonify({
            'error': 'Status update failed',
            'details': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/mobile/work-orders/<work_order_id>')
@require_auth(['admin', 'scheduler', 'supervisor', 'floor_view'])
def mobile_get_work_order(work_order_id):
    """Get work order details for mobile interface"""
    try:
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Get work order details
        cursor.execute("""
            SELECT 
                wo.id,
                wo.work_order_number,
                wo.line_number,
                c.name as customer_name,
                a.assembly_number,
                a.revision,
                wo.quantity,
                wo.status,
                pl.line_name,
                wo.trolley_number,
                wo.ship_date,
                wo.kit_date,
                wo.setup_hours_estimated,
                wo.production_time_hours_estimated,
                wo.created_at,
                wo.updated_at
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN production_lines pl ON wo.line_id = pl.id
            WHERE wo.id = %s
        """, (work_order_id,))
        
        work_order = cursor.fetchone()
        if not work_order:
            cursor.close()
            connection.close()
            return jsonify({'error': 'Work order not found'}), 404
        
        # Get recent status history
        cursor.execute("""
            SELECT old_status, new_status, changed_by, notes, changed_at
            FROM work_order_status_history
            WHERE work_order_id = %s
            ORDER BY changed_at DESC
            LIMIT 10
        """, (work_order_id,))
        
        status_history = []
        for row in cursor.fetchall():
            status_history.append({
                'old_status': row[0],
                'new_status': row[1],
                'changed_by': row[2],
                'notes': row[3],
                'changed_at': row[4].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        work_order_data = {
            'id': work_order[0],
            'work_order_number': work_order[1],
            'line_number': work_order[2],
            'qr_code': f"{work_order[1]}-{work_order[2]}", # Compute QR code
            'customer_name': work_order[3],
            'assembly_number': work_order[4],
            'revision': work_order[5],
            'quantity': work_order[6],
            'status': work_order[7],
            'line_name': work_order[8],
            'trolley_number': work_order[9],
            'ship_date': work_order[10].isoformat() if work_order[10] else None,
            'kit_date': work_order[11].isoformat() if work_order[11] else None,
            'setup_hours_estimated': float(work_order[12]) if work_order[12] else None,
            'production_hours_estimated': float(work_order[13]) if work_order[13] else None,
            'created_at': work_order[14].isoformat(),
            'updated_at': work_order[15].isoformat(),
            'status_history': status_history
        }
        
        return jsonify({
            'work_order': work_order_data,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Mobile get work order error: {e}")
        return jsonify({
            'error': 'Failed to get work order',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/mobile/statuses')
@require_auth(['admin', 'scheduler', 'supervisor', 'floor_view'])
def mobile_get_valid_statuses():
    """Get list of valid work order statuses for mobile interface"""
    statuses = [
        {'value': '1st Side Ready', 'label': '1st Side Ready', 'color': 'bg-yellow-500'},
        {'value': 'Ready', 'label': 'Ready', 'color': 'bg-green-500'},
        {'value': 'Ready*', 'label': 'Ready*', 'color': 'bg-green-400'},
        {'value': 'In Progress', 'label': 'In Progress', 'color': 'bg-blue-500'},
        {'value': 'Setup', 'label': 'Setup', 'color': 'bg-purple-500'},
        {'value': 'Running', 'label': 'Running', 'color': 'bg-indigo-500'},
        {'value': 'Quality Check', 'label': 'Quality Check', 'color': 'bg-orange-500'},
        {'value': 'On Hold', 'label': 'On Hold', 'color': 'bg-yellow-600'},
        {'value': 'Issues', 'label': 'Issues', 'color': 'bg-red-500'},
        {'value': 'Completed', 'label': 'Completed', 'color': 'bg-green-600'},
        {'value': 'Missing TSM-125-01-L-DV', 'label': 'Missing Parts', 'color': 'bg-red-600'},
        {'value': 'Cancelled', 'label': 'Cancelled', 'color': 'bg-gray-500'}
    ]
    
    return jsonify({
        'statuses': statuses,
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/api/timeline/work-orders/<work_order_id>/status', methods=['PUT', 'OPTIONS'])
def timeline_update_work_order_status(work_order_id):
    """Update work order status from Timeline View"""
    
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = jsonify({'message': 'CORS preflight'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'PUT,OPTIONS')
        return response
    
    # Require authentication for PUT requests
    token = None
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
        except IndexError:
            pass
    
    if not token:
        response = jsonify({'error': 'Authentication token required'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    payload = decode_jwt_token(token)
    if not payload:
        response = jsonify({'error': 'Invalid or expired token'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Check role permissions
    required_roles = ['admin', 'scheduler', 'supervisor']
    if payload.get('role') not in required_roles:
        response = jsonify({'error': 'Insufficient permissions'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    # Add user info to request context
    request.current_user = {
        'user_id': payload['user_id'],
        'username': payload['username'],
        'role': payload['role']
    }
    
    try:
        data = request.get_json()
        if not data or not data.get('status'):
            response = jsonify({'error': 'Status is required'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        new_status = data['status'].strip()
        updated_by = request.current_user['username']
        
        # Validate status - use same validation as mobile endpoint
        valid_statuses = [
            '1st Side Ready', 'Ready', 'Ready*', 'In Progress', 
            'Setup', 'Running', 'Completed', 'On Hold', 'Issues',
            'Missing TSM-125-01-L-DV', 'Quality Check', 'Cancelled'
        ]
        
        if new_status not in valid_statuses:
            response = jsonify({
                'error': f'Invalid status. Valid options: {", ".join(valid_statuses)}'
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        connection = get_database_connection()
        if not connection:
            response = jsonify({'error': 'Database connection failed'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500
        
        try:
            cursor = connection.cursor()
            
            # Get current work order details
            cursor.execute("""
                SELECT wo.work_order_number, wo.status, c.name, a.assembly_number, wo.line_number
                FROM work_orders wo
                JOIN assemblies a ON wo.assembly_id = a.id
                JOIN customers c ON a.customer_id = c.id
                WHERE wo.id = %s
            """, (work_order_id,))
            
            work_order = cursor.fetchone()
            if not work_order:
                cursor.close()
                connection.close()
                response = jsonify({'error': 'Work order not found'})
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response, 404
            
            old_status = work_order[1]
            
            # Don't update if status is the same
            if old_status == new_status:
                cursor.close()
                connection.close()
                response = jsonify({
                    'message': 'Status unchanged',
                    'work_order_number': work_order[0],
                    'status': new_status,
                    'timestamp': datetime.now().isoformat()
                })
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response, 200
            
            # Update work order status
            cursor.execute("""
                UPDATE work_orders 
                SET status = %s, updated_at = NOW()
                WHERE id = %s
            """, (new_status, work_order_id))
            
            # Create status history record
            cursor.execute("""
                INSERT INTO work_order_status_history 
                (work_order_id, old_status, new_status, changed_by, notes, changed_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (work_order_id, old_status, new_status, updated_by, 'Updated from Timeline View'))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            # Prepare work order data for broadcast
            work_order_broadcast_data = {
                'id': work_order_id,
                'work_order_number': work_order[0],
                'qr_code': f"{work_order[0]}-{work_order[4]}" if work_order[4] else None,
                'customer_name': work_order[2],
                'assembly_number': work_order[3],
                'line_name': None,  # We could fetch this if needed
                'line_number': work_order[4],
                'quantity': None,  # We could fetch this if needed
                'trolley_number': None  # We could fetch this if needed
            }
            
            # Broadcast the status update to connected clients
            broadcast_status_update(work_order_broadcast_data, old_status, new_status, updated_by)
            
            response = jsonify({
                'message': 'Status updated successfully',
                'work_order_number': work_order[0],
                'old_status': old_status,
                'new_status': new_status,
                'updated_by': updated_by,
                'broadcast': 'sent',
                'timestamp': datetime.now().isoformat()
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 200
            
        except Exception as db_error:
            logger.error(f"Database error in timeline status update: {db_error}")
            if connection:
                connection.rollback()
                connection.close()
            response = jsonify({
                'error': f'Database operation failed: {str(db_error)}',
                'timestamp': datetime.now().isoformat()
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500
        
    except Exception as e:
        logger.error(f"Timeline status update error: {e}")
        response = jsonify({
            'error': 'Status update failed',
            'details': str(e),
            'timestamp': datetime.now().isoformat()
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

@app.route('/api/mobile/qr/<qr_code>')
@require_auth(['admin', 'scheduler', 'supervisor', 'floor_view'])
def mobile_qr_lookup(qr_code):
    """Look up work order by QR code (format: work_order_number-line_number)"""
    try:
        # Parse QR code format: work_order_number-line_number
        if '-' not in qr_code:
            return jsonify({
                'error': 'Invalid QR code format. Expected: work_order_number-line_number',
                'example': '13906.2-1',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Split QR code into work order number and line number
        parts = qr_code.rsplit('-', 1)  # Split from right to handle numbers with decimals
        if len(parts) != 2:
            return jsonify({
                'error': 'Invalid QR code format. Expected: work_order_number-line_number',
                'example': '13906.2-1',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        work_order_number = parts[0]
        try:
            line_number = int(parts[1])
        except ValueError:
            return jsonify({
                'error': 'Line number must be an integer',
                'provided': parts[1],
                'timestamp': datetime.now().isoformat()
            }), 400
        
        connection = get_database_connection()
        if not connection:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = connection.cursor()
        
        # Look up work order by work_order_number and line_number
        cursor.execute("""
            SELECT 
                wo.id,
                wo.work_order_number,
                wo.line_number,
                c.name as customer_name,
                a.assembly_number,
                a.revision,
                wo.quantity,
                wo.status,
                pl.line_name,
                wo.trolley_number,
                wo.ship_date,
                wo.kit_date,
                wo.setup_hours_estimated,
                wo.production_time_hours_estimated,
                wo.line_position,
                wo.created_at,
                wo.updated_at
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN production_lines pl ON wo.line_id = pl.id
            WHERE wo.work_order_number = %s AND wo.line_number = %s
        """, (work_order_number, line_number))
        
        work_order = cursor.fetchone()
        if not work_order:
            cursor.close()
            connection.close()
            return jsonify({
                'error': 'Work order not found',
                'qr_code': qr_code,
                'work_order_number': work_order_number,
                'line_number': line_number,
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get recent status history
        cursor.execute("""
            SELECT old_status, new_status, changed_by, notes, changed_at
            FROM work_order_status_history
            WHERE work_order_id = %s
            ORDER BY changed_at DESC
            LIMIT 10
        """, (work_order[0],))
        
        status_history = []
        for row in cursor.fetchall():
            status_history.append({
                'old_status': row[0],
                'new_status': row[1],
                'changed_by': row[2],
                'notes': row[3],
                'changed_at': row[4].isoformat()
            })
        
        cursor.close()
        connection.close()
        
        # Build response with QR code included
        work_order_data = {
            'id': work_order[0],
            'work_order_number': work_order[1],
            'line_number': work_order[2],
            'qr_code': qr_code,  # Include the scanned QR code
            'customer_name': work_order[3],
            'assembly_number': work_order[4],
            'revision': work_order[5],
            'quantity': work_order[6],
            'status': work_order[7],
            'line_name': work_order[8],
            'trolley_number': work_order[9],
            'ship_date': work_order[10].isoformat() if work_order[10] else None,
            'kit_date': work_order[11].isoformat() if work_order[11] else None,
            'setup_hours_estimated': float(work_order[12]) if work_order[12] else None,
            'production_hours_estimated': float(work_order[13]) if work_order[13] else None,
            'line_position': work_order[14],
            'created_at': work_order[15].isoformat(),
            'updated_at': work_order[16].isoformat(),
            'status_history': status_history
        }
        
        return jsonify({
            'work_order': work_order_data,
            'qr_lookup': {
                'qr_code': qr_code,
                'work_order_number': work_order_number,
                'line_number': line_number,
                'lookup_time': datetime.now().isoformat()
            },
            'message': 'Work order found via QR code',
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"QR lookup error: {e}")
        return jsonify({
            'error': 'QR code lookup failed',
            'qr_code': qr_code,
            'details': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# Server-Sent Events (SSE) Implementation
@app.route('/api/events')
def stream_events():
    """Server-Sent Events endpoint for real-time updates"""
    # Get token from query parameter since EventSource can't send headers
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Authentication token required'}), 401
    
    # Validate token
    try:
        payload = decode_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Invalid token'}), 401
        
        user_role = payload.get('role')
        if user_role not in ['admin', 'scheduler', 'supervisor', 'floor_view']:
            return jsonify({'error': 'Access denied'}), 403
            
    except Exception as e:
        logger.error(f"SSE auth error: {e}")
        return jsonify({'error': 'Authentication failed'}), 401
    
    def event_generator():
        # Send initial connection message
        yield f"data: {json.dumps({'type': 'connected', 'message': 'SSE connected', 'user': payload.get('username'), 'timestamp': datetime.now().isoformat()})}\n\n"
        
        # Keep connection alive and send updates
        last_heartbeat = time.time()
        
        while True:
            # Send heartbeat every 30 seconds
            if time.time() - last_heartbeat > 30:
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
                last_heartbeat = time.time()
            
            # Check for updates in queue
            try:
                # Non-blocking check for updates
                if not update_queue.empty():
                    update = update_queue.get(timeout=1)
                    yield f"data: {json.dumps(update)}\n\n"
                else:
                    time.sleep(1)  # Wait 1 second before checking again
            except:
                break
    
    response = Response(event_generator(), mimetype='text/event-stream')
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['Connection'] = 'keep-alive'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

def broadcast_status_update(work_order_data, old_status, new_status, updated_by):
    """Broadcast work order status updates via both SSE and Socket.IO"""
    try:
        update_data = {
            'type': 'work_order_update',  # Changed to match SSE context expectations
            'work_order': {
                'id': work_order_data.get('id'),
                'work_order_number': work_order_data.get('work_order_number'),
                'qr_code': work_order_data.get('qr_code'),
                'customer_name': work_order_data.get('customer_name'),
                'assembly_number': work_order_data.get('assembly_number'),
                'line_name': work_order_data.get('line_name'),
                'line_number': work_order_data.get('line_number'),
                'status': new_status,
                'quantity': work_order_data.get('quantity'),
                'trolley_number': work_order_data.get('trolley_number')
            },
            'status_change': {
                'old_status': old_status,
                'new_status': new_status,
                'updated_by': updated_by,
                'timestamp': datetime.now().isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }
        
        # Broadcast via SSE (existing functionality)
        update_queue.put(update_data)
        
        # Broadcast via Socket.IO to all rooms
        socketio.emit('work_order_update', update_data, room='timeline')
        socketio.emit('work_order_update', update_data, room='floor_display')
        
        logger.info(f"Broadcasted update via SSE + Socket.IO: {work_order_data.get('work_order_number')} {old_status} → {new_status}")
        
    except Exception as e:
        logger.error(f"Error broadcasting status update: {e}")

# Enhanced Room Management for Phase 3
def get_user_from_token(token):
    """Extract user info from JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return {
            'user_id': payload.get('user_id'),
            'username': payload.get('username'),
            'role': payload.get('role')
        }
    except jwt.InvalidTokenError:
        return None

def add_user_to_room(sid, room, user_info):
    """Add user to room with tracking"""
    if room not in room_users:
        room_users[room] = {}
    
    room_users[room][sid] = user_info
    
    if sid not in user_sessions:
        user_sessions[sid] = {'user_info': user_info, 'rooms': set()}
    user_sessions[sid]['rooms'].add(room)
    
    logger.info(f"User {user_info['username']} ({sid}) joined room: {room}")

def remove_user_from_room(sid, room):
    """Remove user from room"""
    if room in room_users and sid in room_users[room]:
        user_info = room_users[room][sid]
        del room_users[room][sid]
        
        if sid in user_sessions:
            user_sessions[sid]['rooms'].discard(room)
        
        logger.info(f"User {user_info['username']} ({sid}) left room: {room}")
        return user_info
    return None

def cleanup_user_session(sid):
    """Clean up user from all rooms on disconnect"""
    if sid in user_sessions:
        user_info = user_sessions[sid]['user_info']
        rooms = list(user_sessions[sid]['rooms'])
        
        for room in rooms:
            remove_user_from_room(sid, room)
            # Broadcast user left to room
            socketio.emit('user_left_room', {
                'user': user_info,
                'room': room,
                'timestamp': datetime.now().isoformat()
            }, room=room)
        
        del user_sessions[sid]
        logger.info(f"Cleaned up session for user {user_info['username']} ({sid})")

def get_room_users(room):
    """Get list of users in a room"""
    if room not in room_users:
        return []
    return list(room_users[room].values())

# Socket.IO Event Handlers - Enhanced
@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection with authentication"""
    logger.info(f"Client connected: {request.sid}")
    
    try:
        # Extract token from auth data
        token = auth.get('token') if auth else None
        if not token:
            logger.warning(f"Client {request.sid} connected without token")
            emit('error', {'message': 'Authentication required'})
            return False
        
        # Validate user
        user_info = get_user_from_token(token)
        if not user_info:
            logger.warning(f"Client {request.sid} provided invalid token")
            emit('error', {'message': 'Invalid authentication token'})
            return False
        
        # Store user session
        user_sessions[request.sid] = {
            'user_info': user_info,
            'rooms': set()
        }
        
        emit('connected', {
            'message': 'Connected to Socket.IO server',
            'sid': request.sid,
            'user': user_info
        })
        
        logger.info(f"User {user_info['username']} authenticated successfully")
        
    except Exception as e:
        logger.error(f"Error in Socket.IO connect handler: {e}")
        emit('error', {'message': 'Connection failed'})
        return False

@socketio.on('disconnect') 
def handle_disconnect():
    """Handle client disconnection with cleanup"""
    logger.info(f"Client disconnected: {request.sid}")
    cleanup_user_session(request.sid)

@socketio.on('join_room')
def handle_join_room(data):
    """Handle client joining a room with user presence"""
    room = data.get('room')
    if room not in ['timeline', 'floor_display']:
        emit('error', {'message': f'Invalid room: {room}'})
        return
    
    if request.sid not in user_sessions:
        emit('error', {'message': 'User session not found'})
        return
    
    user_info = user_sessions[request.sid]['user_info']
    
    join_room(room)
    add_user_to_room(request.sid, room, user_info)
    
    # Get current room users
    room_users_list = get_room_users(room)
    
    # Notify user of successful join
    emit('room_joined', {
        'room': room, 
        'message': f'Joined {room} room',
        'users_in_room': room_users_list,
        'user_count': len(room_users_list)
    })
    
    # Broadcast to others in room that user joined
    emit('user_joined_room', {
        'user': user_info,
        'room': room,
        'user_count': len(room_users_list),
        'timestamp': datetime.now().isoformat()
    }, room=room, include_self=False)

@socketio.on('leave_room')
def handle_leave_room(data):
    """Handle client leaving a room with presence updates"""
    room = data.get('room')
    if room not in ['timeline', 'floor_display']:
        emit('error', {'message': f'Invalid room: {room}'})
        return
    
    user_info = remove_user_from_room(request.sid, room)
    if user_info:
        leave_room(room)
        
        room_users_list = get_room_users(room)
        
        emit('room_left', {
            'room': room, 
            'message': f'Left {room} room'
        })
        
        # Broadcast to others that user left
        emit('user_left_room', {
            'user': user_info,
            'room': room,
            'user_count': len(room_users_list),
            'timestamp': datetime.now().isoformat()
        }, room=room)
    else:
        emit('error', {'message': f'User not in room: {room}'})

# New Interactive Features
@socketio.on('timeline_interaction')
def handle_timeline_interaction(data):
    """Handle Timeline-specific interactions"""
    if request.sid not in user_sessions:
        emit('error', {'message': 'User session not found'})
        return
    
    user_info = user_sessions[request.sid]['user_info']
    interaction_type = data.get('type')
    
    if interaction_type == 'work_order_select':
        # Broadcast work order selection to other timeline users
        emit('timeline_work_order_selected', {
            'user': user_info,
            'work_order_id': data.get('work_order_id'),
            'work_order_number': data.get('work_order_number'),
            'timestamp': datetime.now().isoformat()
        }, room='timeline', include_self=False)
        
    elif interaction_type == 'status_change_start':
        # Broadcast that user is starting a status change
        emit('timeline_status_change_start', {
            'user': user_info,
            'work_order_id': data.get('work_order_id'),
            'work_order_number': data.get('work_order_number'),
            'timestamp': datetime.now().isoformat()
        }, room='timeline', include_self=False)

@socketio.on('get_room_users')
def handle_get_room_users(data):
    """Get current users in a room"""
    room = data.get('room')
    if room in ['timeline', 'floor_display']:
        room_users_list = get_room_users(room)
        emit('room_users_update', {
            'room': room,
            'users': room_users_list,
            'user_count': len(room_users_list),
            'timestamp': datetime.now().isoformat()
        })
    else:
        emit('error', {'message': f'Invalid room: {room}'})

# Test endpoint for broadcasting
@app.route('/api/test/broadcast', methods=['POST'])
@require_auth(['admin'])
def test_broadcast():
    """Test endpoint to trigger status update broadcasting"""
    try:
        # Sample work order data for testing
        test_work_order_data = {
            'id': 'test-12345',
            'work_order_number': 'TEST-001',
            'qr_code': 'TEST-001-1',
            'customer_name': 'Test Customer',
            'assembly_number': 'TEST-ASSEMBLY',
            'line_name': '1-EURO 264 (1)',
            'line_number': 1,
            'quantity': 100,
            'trolley_number': 1
        }
        
        old_status = '1st Side Ready'
        new_status = 'In Progress'
        updated_by = 'Test User'
        
        # Trigger the broadcast
        broadcast_status_update(test_work_order_data, old_status, new_status, updated_by)
        
        return jsonify({
            'message': 'Test broadcast sent successfully',
            'test_data': {
                'work_order': test_work_order_data,
                'status_change': {
                    'old_status': old_status,
                    'new_status': new_status,
                    'updated_by': updated_by
                }
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Test broadcast error: {e}")
        return jsonify({'error': 'Test broadcast failed'}), 500

# SSE Health check endpoint
@app.route('/api/sse/health')
def sse_health():
    """Check if SSE is working"""
    return jsonify({
        'sse_status': 'active',
        'version': '2.4-sse',
        'queue_size': update_queue.qsize(),
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting SMT Production Schedule Database application v2.4 - Real-time Updates Ready")
    
    # Auto-initialize database if enabled
    auto_init = os.environ.get('AUTO_INIT_DB', 'true').lower() == 'true'
    if auto_init:
        logger.info("Auto-initialization enabled, checking database...")
        success = initialize_database()
        if success:
            logger.info("Database initialization completed successfully")
        else:
            logger.warning("Database initialization failed or was skipped")
    else:
        logger.info("Auto-initialization disabled, skipping database setup")
    
    # Use Socket.IO runner for real-time features alongside SSE
    logger.info("Starting SMT Production Database v2.5-Hybrid with SSE + Socket.IO")
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True) 