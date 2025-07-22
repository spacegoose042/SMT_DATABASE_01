#!/usr/bin/env python3
"""
CSV Import Script for SMT Production Schedule Database
Handles importing production schedule data from CSV files with validation and error handling.
"""

import csv
import psycopg2
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CSVImporter:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        self.cursor = None
        self.stats = {
            'total_rows': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(self.database_url)
            self.cursor = self.connection.cursor()
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        logger.info("Database connection closed")
    
    def get_or_create_customer(self, customer_name: str) -> str:
        """Get existing customer ID or create new customer"""
        self.cursor.execute(
            "SELECT id FROM customers WHERE name = %s AND active = true",
            (customer_name,)
        )
        result = self.cursor.fetchone()
        
        if result:
            return result[0]
        else:
            self.cursor.execute(
                "INSERT INTO customers (name) VALUES (%s) RETURNING id",
                (customer_name,)
            )
            return self.cursor.fetchone()[0]
    
    def get_or_create_assembly(self, customer_id: str, assembly_number: str, revision: str) -> str:
        """Get existing assembly ID or create new assembly"""
        self.cursor.execute(
            "SELECT id FROM assemblies WHERE customer_id = %s AND assembly_number = %s AND revision = %s AND active = true",
            (customer_id, assembly_number, revision)
        )
        result = self.cursor.fetchone()
        
        if result:
            return result[0]
        else:
            self.cursor.execute(
                "INSERT INTO assemblies (customer_id, assembly_number, revision) VALUES (%s, %s, %s) RETURNING id",
                (customer_id, assembly_number, revision)
            )
            return self.cursor.fetchone()[0]
    
    def get_production_line_id(self, line_name: str) -> Optional[str]:
        """Get production line ID by name"""
        if not line_name or line_name.strip() == '':
            return None
            
        self.cursor.execute(
            "SELECT id FROM production_lines WHERE line_name = %s AND active = true",
            (line_name.strip(),)
        )
        result = self.cursor.fetchone()
        return result[0] if result else None
    
    def parse_date(self, date_str: str) -> Optional[datetime.date]:
        """Parse date string in various formats"""
        if not date_str or date_str.strip() == '':
            return None
        
        date_str = date_str.strip()
        
        # Try different date formats
        formats = ['%m/%d', '%m/%d/%Y', '%Y-%m-%d', '%m/%d/%y']
        
        for fmt in formats:
            try:
                parsed_date = datetime.strptime(date_str, fmt).date()
                # If year is not specified, assume current year
                if fmt == '%m/%d':
                    current_year = datetime.now().year
                    parsed_date = parsed_date.replace(year=current_year)
                return parsed_date
            except ValueError:
                continue
        
        logger.warning(f"Could not parse date: {date_str}")
        return None
    
    def parse_number(self, number_str: str) -> Optional[float]:
        """Parse number string, handling commas and empty values"""
        if not number_str or number_str.strip() == '':
            return None
        
        # Remove commas and convert to float
        try:
            return float(number_str.replace(',', ''))
        except ValueError:
            logger.warning(f"Could not parse number: {number_str}")
            return None
    
    def validate_work_order_data(self, row: Dict) -> Tuple[bool, List[str]]:
        """Validate work order data according to business rules"""
        errors = []
        
        # Required fields
        if not row.get('WO'):
            errors.append("Work order number is required")
        
        if not row.get('Customer'):
            errors.append("Customer is required")
        
        if not row.get('Assembly'):
            errors.append("Assembly is required")
        
        # Date validation
        kit_date = self.parse_date(row.get('Kit Date', ''))
        ship_date = self.parse_date(row.get('Ship Date', ''))
        
        if kit_date and ship_date and ship_date < kit_date:
            errors.append("Ship date must be after kit date")
        
        # Quantity validation
        qty = self.parse_number(row.get('Qty', ''))
        if qty is not None and qty <= 0:
            errors.append("Quantity must be positive")
        
        return len(errors) == 0, errors
    
    def upsert_work_order(self, row: Dict) -> bool:
        """Insert or update work order based on work order number"""
        try:
            # Validate data
            is_valid, errors = self.validate_work_order_data(row)
            if not is_valid:
                logger.error(f"Validation errors for WO {row.get('WO', 'Unknown')}: {errors}")
                self.stats['errors'].append(f"WO {row.get('WO', 'Unknown')}: {', '.join(errors)}")
                return False
            
            # Get or create customer
            customer_id = self.get_or_create_customer(row['Customer'])
            
            # Get or create assembly
            assembly_id = self.get_or_create_assembly(
                customer_id, 
                row['Assembly'], 
                row.get('Rev', '')
            )
            
            # Get production line
            line_id = self.get_production_line_id(row.get('Line', ''))
            
            # Parse dates
            kit_date = self.parse_date(row.get('Kit Date', ''))
            ship_date = self.parse_date(row.get('Ship Date', ''))
            
            # Parse numbers
            qty = self.parse_number(row.get('Qty', ''))
            time_mins = self.parse_number(row.get('Time (mins)', ''))
            setup_hrs = self.parse_number(row.get('Set Up (hrs)', ''))
            time_hrs = self.parse_number(row.get('Time (hrs)', ''))
            time_days = self.parse_number(row.get('Time (days)', ''))
            trolley = self.parse_number(row.get('Trolley', ''))
            line_pos = self.parse_number(row.get('Line Position', ''))
            
            # Check if work order exists
            self.cursor.execute(
                "SELECT id FROM work_orders WHERE work_order_number = %s",
                (row['WO'],)
            )
            existing_wo = self.cursor.fetchone()
            
            if existing_wo:
                # Update existing work order
                self.cursor.execute("""
                    UPDATE work_orders SET
                        assembly_id = %s,
                        quantity = %s,
                        status = %s,
                        kit_date = %s,
                        ship_date = %s,
                        setup_hours_estimated = %s,
                        production_time_minutes_estimated = %s,
                        production_time_hours_estimated = %s,
                        production_time_days_estimated = %s,
                        trolley_number = %s,
                        line_id = %s,
                        line_position = %s,
                        updated_at = NOW()
                    WHERE work_order_number = %s
                """, (
                    assembly_id, qty, row.get('Status', 'Ready'), kit_date, ship_date,
                    setup_hrs, time_mins, time_hrs, time_days, trolley, line_id, line_pos, row['WO']
                ))
                logger.info(f"Updated work order: {row['WO']}")
            else:
                # Insert new work order
                self.cursor.execute("""
                    INSERT INTO work_orders (
                        work_order_number, assembly_id, quantity, status, kit_date, ship_date,
                        setup_hours_estimated, production_time_minutes_estimated, 
                        production_time_hours_estimated, production_time_days_estimated,
                        trolley_number, line_id, line_position
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    row['WO'], assembly_id, qty, row.get('Status', 'Ready'), kit_date, ship_date,
                    setup_hrs, time_mins, time_hrs, time_days, trolley, line_id, line_pos
                ))
                logger.info(f"Inserted work order: {row['WO']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing work order {row.get('WO', 'Unknown')}: {e}")
            self.stats['errors'].append(f"WO {row.get('WO', 'Unknown')}: {str(e)}")
            return False
    
    def import_csv(self, csv_file_path: str) -> Dict:
        """Import CSV file and return statistics"""
        self.stats = {
            'total_rows': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                # Skip the first 5 rows (configuration data)
                for _ in range(5):
                    next(file)
                
                reader = csv.DictReader(file)
                
                for row_num, row in enumerate(reader, start=7):  # Start at 7 because we skipped 5 rows + header
                    # Skip empty rows
                    if not row.get('Customer') or not row.get('WO'):
                        continue
                        
                    self.stats['total_rows'] += 1
                    try:
                        if self.upsert_work_order(row):
                            self.stats['successful'] += 1
                        else:
                            self.stats['failed'] += 1
                    except Exception as e:
                        self.stats['failed'] += 1
                        self.stats['errors'].append(f"Row {row_num}: {str(e)}")
                
                # Commit all changes
                self.connection.commit()
                logger.info(f"Import completed: {self.stats['successful']} successful, {self.stats['failed']} failed")
                
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            self.connection.rollback()
            raise
        
        return self.stats

def main():
    """Main function to run the CSV import"""
    parser = argparse.ArgumentParser(description='Import CSV data into SMT Production Schedule Database')
    parser.add_argument('csv_file', help='Path to the CSV file to import')
    parser.add_argument('--database-url', help='Database URL (overrides DATABASE_URL environment variable)')
    parser.add_argument('--dry-run', action='store_true', help='Validate CSV without importing')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    csv_file_path = args.csv_file
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file '{csv_file_path}' not found")
        sys.exit(1)
    
    # Get database URL from arguments or environment
    database_url = args.database_url or os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not set and --database-url not provided")
        sys.exit(1)
    
    importer = CSVImporter(database_url)
    
    try:
        importer.connect()
        
        if args.dry_run:
            print("DRY RUN MODE - No data will be imported")
            # Just validate the CSV structure
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                headers = reader.fieldnames
                print(f"CSV Headers: {headers}")
                row_count = sum(1 for row in reader)
                print(f"Total rows to process: {row_count}")
        else:
            stats = importer.import_csv(csv_file_path)
            
            print(f"\nImport Summary:")
            print(f"Total rows processed: {stats['total_rows']}")
            print(f"Successful: {stats['successful']}")
            print(f"Failed: {stats['failed']}")
            
            if stats['errors']:
                print(f"\nErrors:")
                for error in stats['errors'][:10]:  # Show first 10 errors
                    print(f"  {error}")
                if len(stats['errors']) > 10:
                    print(f"  ... and {len(stats['errors']) - 10} more errors")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        importer.disconnect()

if __name__ == "__main__":
    main() 