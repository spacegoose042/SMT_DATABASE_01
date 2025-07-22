#!/usr/bin/env python3
"""
CSV Export Script for SMT Production Schedule Database
Exports data from the database to CSV format for backup and analysis.
"""

import csv
import psycopg2
import sys
import os
from datetime import datetime
from typing import Dict, List, Optional
import logging
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CSVExporter:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        self.cursor = None
        
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
    
    def export_work_orders(self, output_file: str, filters: Dict = None) -> int:
        """Export work orders to CSV"""
        query = """
            SELECT 
                wo.work_order_number as "WO",
                c.name as "Customer",
                a.assembly_number as "Assembly",
                a.revision as "Rev",
                wo.quantity as "Qty",
                wo.status as "Status",
                wo.kit_date as "Kit Date",
                wo.trolley_number as "Trolley",
                wo.ship_date as "Ship Date",
                wo.setup_hours_estimated as "Set Up (hrs)",
                wo.production_time_hours_estimated as "Time (hrs)",
                wo.production_time_days_estimated as "Time (days)",
                pl.line_name as "Line",
                wo.line_position as "Line Position",
                wo.setup_hours_actual as "Setup Hours Actual",
                wo.production_time_hours_actual as "Production Hours Actual",
                wo.completion_date as "Completion Date",
                wo.created_at as "Created At",
                wo.updated_at as "Updated At"
            FROM work_orders wo
            JOIN assemblies a ON wo.assembly_id = a.id
            JOIN customers c ON a.customer_id = c.id
            LEFT JOIN production_lines pl ON wo.line_id = pl.id
            WHERE wo.active = true
        """
        
        params = []
        if filters:
            if filters.get('customer'):
                query += " AND c.name = %s"
                params.append(filters['customer'])
            if filters.get('status'):
                query += " AND wo.status = %s"
                params.append(filters['status'])
            if filters.get('date_from'):
                query += " AND wo.ship_date >= %s"
                params.append(filters['date_from'])
            if filters.get('date_to'):
                query += " AND wo.ship_date <= %s"
                params.append(filters['date_to'])
        
        query += " ORDER BY wo.ship_date, wo.work_order_number"
        
        self.cursor.execute(query, params)
        rows = self.cursor.fetchall()
        
        if not rows:
            logger.warning("No work orders found matching criteria")
            return 0
        
        # Get column names
        columns = [desc[0] for desc in self.cursor.description]
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(columns)
            writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} work orders to {output_file}")
        return len(rows)
    
    def export_line_schedules(self, output_file: str) -> int:
        """Export line schedules view to CSV"""
        query = """
            SELECT * FROM line_schedules
            ORDER BY line_name, ship_date, line_position
        """
        
        self.cursor.execute(query)
        rows = self.cursor.fetchall()
        
        if not rows:
            logger.warning("No line schedules found")
            return 0
        
        columns = [desc[0] for desc in self.cursor.description]
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(columns)
            writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} line schedules to {output_file}")
        return len(rows)
    
    def export_trolley_usage(self, output_file: str) -> int:
        """Export trolley usage to CSV"""
        query = """
            SELECT * FROM trolley_usage
            ORDER BY trolley_number
        """
        
        self.cursor.execute(query)
        rows = self.cursor.fetchall()
        
        if not rows:
            logger.warning("No trolley usage data found")
            return 0
        
        columns = [desc[0] for desc in self.cursor.description]
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(columns)
            writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} trolley usage records to {output_file}")
        return len(rows)
    
    def export_line_performance(self, output_file: str) -> int:
        """Export line performance data to CSV"""
        query = """
            SELECT * FROM line_performance
            ORDER BY line_name
        """
        
        self.cursor.execute(query)
        rows = self.cursor.fetchall()
        
        if not rows:
            logger.warning("No line performance data found")
            return 0
        
        columns = [desc[0] for desc in self.cursor.description]
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(columns)
            writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} line performance records to {output_file}")
        return len(rows)
    
    def export_customer_summary(self, output_file: str) -> int:
        """Export customer work order summary to CSV"""
        query = """
            SELECT * FROM customer_work_orders
            ORDER BY customer_name
        """
        
        self.cursor.execute(query)
        rows = self.cursor.fetchall()
        
        if not rows:
            logger.warning("No customer data found")
            return 0
        
        columns = [desc[0] for desc in self.cursor.description]
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(columns)
            writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} customer records to {output_file}")
        return len(rows)
    
    def export_full_backup(self, output_dir: str) -> Dict[str, int]:
        """Export all data for full backup"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results = {}
        
        # Export work orders
        work_orders_file = os.path.join(output_dir, f"work_orders_{timestamp}.csv")
        results['work_orders'] = self.export_work_orders(work_orders_file)
        
        # Export line schedules
        schedules_file = os.path.join(output_dir, f"line_schedules_{timestamp}.csv")
        results['line_schedules'] = self.export_line_schedules(schedules_file)
        
        # Export trolley usage
        trolley_file = os.path.join(output_dir, f"trolley_usage_{timestamp}.csv")
        results['trolley_usage'] = self.export_trolley_usage(trolley_file)
        
        # Export line performance
        performance_file = os.path.join(output_dir, f"line_performance_{timestamp}.csv")
        results['line_performance'] = self.export_line_performance(performance_file)
        
        # Export customer summary
        customer_file = os.path.join(output_dir, f"customer_summary_{timestamp}.csv")
        results['customer_summary'] = self.export_customer_summary(customer_file)
        
        logger.info(f"Full backup completed to {output_dir}")
        return results

def main():
    """Main function to run the CSV export"""
    parser = argparse.ArgumentParser(description='Export data from SMT Production Schedule Database')
    parser.add_argument('--type', choices=['work_orders', 'line_schedules', 'trolley_usage', 'line_performance', 'customer_summary', 'full_backup'], 
                       default='work_orders', help='Type of export to perform')
    parser.add_argument('--output', '-o', required=True, help='Output file or directory (for full_backup)')
    parser.add_argument('--database-url', help='Database URL (overrides DATABASE_URL environment variable)')
    parser.add_argument('--customer', help='Filter by customer name')
    parser.add_argument('--status', help='Filter by work order status')
    parser.add_argument('--date-from', help='Filter by ship date from (YYYY-MM-DD)')
    parser.add_argument('--date-to', help='Filter by ship date to (YYYY-MM-DD)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Get database URL from arguments or environment
    database_url = args.database_url or os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not set and --database-url not provided")
        sys.exit(1)
    
    exporter = CSVExporter(database_url)
    
    try:
        exporter.connect()
        
        filters = {}
        if args.customer:
            filters['customer'] = args.customer
        if args.status:
            filters['status'] = args.status
        if args.date_from:
            filters['date_from'] = args.date_from
        if args.date_to:
            filters['date_to'] = args.date_to
        
        if args.type == 'work_orders':
            count = exporter.export_work_orders(args.output, filters)
        elif args.type == 'line_schedules':
            count = exporter.export_line_schedules(args.output)
        elif args.type == 'trolley_usage':
            count = exporter.export_trolley_usage(args.output)
        elif args.type == 'line_performance':
            count = exporter.export_line_performance(args.output)
        elif args.type == 'customer_summary':
            count = exporter.export_customer_summary(args.output)
        elif args.type == 'full_backup':
            results = exporter.export_full_backup(args.output)
            print(f"\nExport Summary:")
            for export_type, count in results.items():
                print(f"  {export_type}: {count} records")
            count = sum(results.values())
        
        print(f"Export completed: {count} records exported")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        exporter.disconnect()

if __name__ == "__main__":
    main() 