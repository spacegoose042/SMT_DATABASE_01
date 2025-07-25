#!/usr/bin/env python3
"""
Add line_number field and sample values to existing work orders for QR code generation
"""

import os
import psycopg2
import random
from datetime import datetime

def add_line_numbers():
    """Add line_number values to existing work orders"""
    try:
        # Connect to database
        connection = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = connection.cursor()
        
        # First, ensure the line_number column exists
        print("Checking if line_number column exists...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='work_orders' AND column_name='line_number'
        """)
        
        if not cursor.fetchone():
            print("Adding line_number column to work_orders table...")
            cursor.execute("ALTER TABLE work_orders ADD COLUMN line_number INTEGER")
            cursor.execute("CREATE INDEX idx_work_orders_qr_lookup ON work_orders(work_order_number, line_number)")
            print("✅ line_number column added successfully")
        else:
            print("✅ line_number column already exists")
        
        # Get all work orders without line_number
        cursor.execute("SELECT id, work_order_number FROM work_orders WHERE line_number IS NULL")
        work_orders = cursor.fetchall()
        
        print(f"Found {len(work_orders)} work orders without line_number")
        
        if len(work_orders) == 0:
            print("All work orders already have line_number values")
            return
        
        # Add line numbers (1-5 randomly for variety)
        updated_count = 0
        for wo_id, wo_number in work_orders:
            line_number = random.randint(1, 5)  # Random line number 1-5
            
            cursor.execute("""
                UPDATE work_orders 
                SET line_number = %s, updated_at = NOW()
                WHERE id = %s
            """, (line_number, wo_id))
            
            print(f"✅ Updated {wo_number} -> line_number: {line_number}")
            updated_count += 1
        
        # Commit changes
        connection.commit()
        print(f"\n🎉 Successfully updated {updated_count} work orders with line_number values!")
        
        # Show some examples
        print("\n📋 Sample QR codes that will be generated:")
        cursor.execute("""
            SELECT work_order_number, line_number 
            FROM work_orders 
            WHERE line_number IS NOT NULL 
            LIMIT 5
        """)
        
        for wo_number, line_num in cursor.fetchall():
            qr_code = f"{wo_number}-{line_num}"
            print(f"  {wo_number} (Line {line_num}) -> QR: {qr_code}")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if connection:
            connection.rollback()
            connection.close()

if __name__ == "__main__":
    print("🎯 Adding line_number values for QR code generation...\n")
    add_line_numbers()
    print("\n✅ Script completed! Refresh your Timeline view to see QR codes.") 