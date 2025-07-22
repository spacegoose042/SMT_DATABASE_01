#!/usr/bin/env python3
"""
SMT Production Schedule Database Web Application
Railway deployment application for database initialization and health checks
"""

import os
import psycopg2
import logging
from flask import Flask, jsonify
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