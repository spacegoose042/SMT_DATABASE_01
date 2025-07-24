#!/usr/bin/env python3
"""
Create admin user in Railway database
Run this script to create the default admin user
"""

import os
import psycopg2
import bcrypt
import uuid
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://postgres:2RiOTYAhg6lYGU7Jl6mVG3AYuqGsWGfN@junction.proxy.rlwy.net:27738/railway"

def hash_password(password):
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_admin_user():
    """Create the admin user"""
    try:
        # Connect to database
        connection = psycopg2.connect(DATABASE_URL)
        cursor = connection.cursor()
        
        # Check if admin user already exists
        cursor.execute("SELECT id FROM users WHERE username = 'admin'")
        if cursor.fetchone():
            print("✅ Admin user already exists!")
            cursor.close()
            connection.close()
            return True
        
        # Create admin user
        user_id = str(uuid.uuid4())
        username = 'admin'
        email = 'admin@smt.local'
        password_hash = hash_password('admin123')
        role = 'admin'
        
        cursor.execute("""
            INSERT INTO users (id, username, email, password_hash, role, active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, username, email, password_hash, role, True, datetime.now(), datetime.now()))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("🎉 Admin user created successfully!")
        print(f"Username: {username}")
        print(f"Password: admin123")
        print(f"Email: {email}")
        print(f"Role: {role}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return False

if __name__ == "__main__":
    print("Creating admin user in Railway database...")
    create_admin_user() 