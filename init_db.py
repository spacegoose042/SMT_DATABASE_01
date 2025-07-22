#!/usr/bin/env python3
"""
Manual database initialization script for SMT Production Schedule Database
Run this script to initialize the database schema and seed data.
"""

import os
import sys
import logging
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_database_connection():
    """Get database connection"""
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            logger.error("DATABASE_URL environment variable not set")
            return None
        
        connection = psycopg2.connect(database_url)
        return connection
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None

def initialize_database():
    """Initialize database schema and seed data"""
    connection = None
    try:
        connection = get_database_connection()
        if not connection:
            logger.error("Could not establish database connection")
            return False
        
        cursor = connection.cursor()
        
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

def main():
    """Main function"""
    logger.info("Starting manual database initialization...")
    
    if initialize_database():
        logger.info("✅ Database initialization completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Database initialization failed!")
        sys.exit(1)

if __name__ == '__main__':
    main() 