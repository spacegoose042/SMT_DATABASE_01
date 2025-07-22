#!/usr/bin/env python3
"""
Backup Utility Script for SMT Production Schedule Database
Provides automated backup functionality and database maintenance.
"""

import os
import sys
import psycopg2
import logging
from datetime import datetime, timedelta
from typing import Dict, List
import argparse
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseBackup:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(self.database_url)
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
        logger.info("Database connection closed")
    
    def get_database_info(self) -> Dict:
        """Get database information"""
        cursor = self.connection.cursor()
        
        # Get database size
        cursor.execute("""
            SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                   current_database() as name
        """)
        size_info = cursor.fetchone()
        
        # Get table counts
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
            FROM pg_stat_user_tables
            ORDER BY tablename
        """)
        table_stats = cursor.fetchall()
        
        # Get work order counts
        cursor.execute("""
            SELECT 
                COUNT(*) as total_work_orders,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status != 'Completed' THEN 1 END) as active
            FROM work_orders
        """)
        wo_stats = cursor.fetchone()
        
        cursor.close()
        
        return {
            'database_name': size_info[1],
            'database_size': size_info[0],
            'table_stats': table_stats,
            'work_orders': {
                'total': wo_stats[0],
                'completed': wo_stats[1],
                'active': wo_stats[2]
            }
        }
    
    def create_csv_backup(self, backup_dir: str) -> str:
        """Create CSV backup using the export script"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(backup_dir, f"csv_backup_{timestamp}")
        
        if not os.path.exists(backup_path):
            os.makedirs(backup_path)
        
        # Run the CSV export script for full backup
        export_script = os.path.join(os.path.dirname(__file__), '..', 'csv_export.py')
        cmd = [
            sys.executable, export_script,
            '--type', 'full_backup',
            '--output', backup_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"CSV backup created successfully: {backup_path}")
            return backup_path
        except subprocess.CalledProcessError as e:
            logger.error(f"CSV backup failed: {e.stderr}")
            raise
    
    def cleanup_old_backups(self, backup_dir: str, days_to_keep: int = 30):
        """Clean up old backup files"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        deleted_count = 0
        
        if not os.path.exists(backup_dir):
            return
        
        for item in os.listdir(backup_dir):
            item_path = os.path.join(backup_dir, item)
            
            # Check if it's a directory and matches backup pattern
            if os.path.isdir(item_path) and item.startswith('csv_backup_'):
                try:
                    # Extract date from directory name
                    date_str = item.split('_')[2:5]  # Get date parts
                    if len(date_str) >= 3:
                        backup_date = datetime.strptime('_'.join(date_str), '%Y%m%d_%H%M%S')
                        
                        if backup_date < cutoff_date:
                            import shutil
                            shutil.rmtree(item_path)
                            logger.info(f"Deleted old backup: {item}")
                            deleted_count += 1
                except (ValueError, IndexError):
                    # Skip if we can't parse the date
                    continue
        
        logger.info(f"Cleanup completed: {deleted_count} old backups deleted")
    
    def generate_backup_report(self, backup_path: str, db_info: Dict) -> str:
        """Generate a backup report"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        report_path = os.path.join(backup_path, "backup_report.txt")
        
        with open(report_path, 'w') as f:
            f.write("SMT Production Schedule Database Backup Report\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Backup Date: {timestamp}\n")
            f.write(f"Database: {db_info['database_name']}\n")
            f.write(f"Database Size: {db_info['database_size']}\n\n")
            
            f.write("Work Order Statistics:\n")
            f.write(f"  Total Work Orders: {db_info['work_orders']['total']}\n")
            f.write(f"  Completed: {db_info['work_orders']['completed']}\n")
            f.write(f"  Active: {db_info['work_orders']['active']}\n\n")
            
            f.write("Table Statistics:\n")
            for table_stat in db_info['table_stats']:
                f.write(f"  {table_stat[1]}: {table_stat[2]} inserts, {table_stat[3]} updates, {table_stat[4]} deletes\n")
        
        logger.info(f"Backup report generated: {report_path}")
        return report_path

def main():
    """Main function for backup operations"""
    parser = argparse.ArgumentParser(description='Database backup and maintenance utilities')
    parser.add_argument('--action', choices=['backup', 'info', 'cleanup'], 
                       default='backup', help='Action to perform')
    parser.add_argument('--backup-dir', default='./backups', help='Backup directory')
    parser.add_argument('--database-url', help='Database URL (overrides DATABASE_URL environment variable)')
    parser.add_argument('--days-to-keep', type=int, default=30, help='Days to keep old backups')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Get database URL from arguments or environment
    database_url = args.database_url or os.getenv('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not set and --database-url not provided")
        sys.exit(1)
    
    backup = DatabaseBackup(database_url)
    
    try:
        backup.connect()
        
        if args.action == 'info':
            # Show database information
            db_info = backup.get_database_info()
            print(f"\nDatabase Information:")
            print(f"  Name: {db_info['database_name']}")
            print(f"  Size: {db_info['database_size']}")
            print(f"\nWork Orders:")
            print(f"  Total: {db_info['work_orders']['total']}")
            print(f"  Completed: {db_info['work_orders']['completed']}")
            print(f"  Active: {db_info['work_orders']['active']}")
            
        elif args.action == 'backup':
            # Create backup
            if not os.path.exists(args.backup_dir):
                os.makedirs(args.backup_dir)
            
            db_info = backup.get_database_info()
            backup_path = backup.create_csv_backup(args.backup_dir)
            backup.generate_backup_report(backup_path, db_info)
            
            print(f"Backup completed successfully: {backup_path}")
            
        elif args.action == 'cleanup':
            # Clean up old backups
            backup.cleanup_old_backups(args.backup_dir, args.days_to_keep)
            print(f"Cleanup completed for backups older than {args.days_to_keep} days")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        backup.disconnect()

if __name__ == "__main__":
    main() 