#!/usr/bin/env python3
"""
Add sample line_number values to existing work orders for QR code generation
This script uses the production API to update work orders.
"""

import requests
import json
import random
import time

# Production API base URL
BASE_URL = "https://smtdatabase01-production.up.railway.app"

# Mock admin credentials (you'll need to use actual admin token)
def get_admin_token():
    """Get admin authentication token"""
    login_data = {
        "username": "admin", 
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            return data.get('token')
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def add_line_numbers_to_work_orders():
    """Add line_number values to existing work orders"""
    print("🎯 Adding line_number values for QR code generation...\n")
    
    # Get admin token
    token = get_admin_token()
    if not token:
        print("❌ Could not get admin token. Please check credentials.")
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # First, let's get all work orders
        print("📋 Fetching existing work orders...")
        response = requests.get(f"{BASE_URL}/api/work-orders", headers=headers)
        
        if response.status_code != 200:
            print(f"❌ Failed to fetch work orders: {response.status_code}")
            return
        
        data = response.json()
        work_orders = data.get('work_orders', [])
        
        print(f"Found {len(work_orders)} work orders")
        
        if len(work_orders) == 0:
            print("No work orders found. Please import some data first.")
            return
        
        # For demonstration, let's create a simple SQL script that can be run manually
        print("\n🔧 Generating SQL script to add line_number values...")
        
        sql_statements = []
        sql_statements.append("-- Add line_number values to existing work orders for QR code generation")
        sql_statements.append("-- Run this script in your Railway PostgreSQL console")
        sql_statements.append("")
        
        # Add the column if it doesn't exist
        sql_statements.append("-- Ensure line_number column exists")
        sql_statements.append("ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS line_number INTEGER;")
        sql_statements.append("CREATE INDEX IF NOT EXISTS idx_work_orders_qr_lookup ON work_orders(work_order_number, line_number);")
        sql_statements.append("")
        
        # Add line numbers to work orders
        sql_statements.append("-- Add random line numbers (1-5) to work orders without line_number")
        for i, wo in enumerate(work_orders[:10]):  # Limit to first 10 for demo
            line_number = random.randint(1, 5)
            wo_number = wo.get('work_order_number', f'WO{i+1}')
            sql_statements.append(f"UPDATE work_orders SET line_number = {line_number} WHERE work_order_number = '{wo_number}' AND line_number IS NULL;")
        
        sql_statements.append("")
        sql_statements.append("-- Verify the updates")
        sql_statements.append("SELECT work_order_number, line_number, CONCAT(work_order_number, '-', line_number) as qr_code FROM work_orders WHERE line_number IS NOT NULL LIMIT 10;")
        
        # Write SQL script to file
        with open('add_line_numbers.sql', 'w') as f:
            f.write('\n'.join(sql_statements))
        
        print("✅ SQL script generated: add_line_numbers.sql")
        print("\n📝 To apply the line numbers:")
        print("1. Go to your Railway project dashboard")
        print("2. Open the PostgreSQL database")
        print("3. Open the Query tab")
        print("4. Copy and paste the contents of add_line_numbers.sql")
        print("5. Run the SQL commands")
        print("6. Refresh your Timeline view to see QR codes!")
        
        # Also show a few sample QR codes that will be generated
        print("\n📋 Sample QR codes that will be generated:")
        for i, wo in enumerate(work_orders[:5]):
            line_number = random.randint(1, 5)
            wo_number = wo.get('work_order_number', f'WO{i+1}')
            qr_code = f"{wo_number}-{line_number}"
            print(f"  {wo_number} (Line {line_number}) -> QR: {qr_code}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    add_line_numbers_to_work_orders() 