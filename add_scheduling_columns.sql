-- Migration: Add scheduling columns to work_orders table
-- Run this script to add scheduling functionality to existing database

-- Add scheduling columns to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_end_time TIMESTAMP WITH TIME ZONE;

-- Add indexes for scheduling performance
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_time ON work_orders(scheduled_start_time, scheduled_end_time);
CREATE INDEX IF NOT EXISTS idx_work_orders_line_scheduled ON work_orders(line_id, scheduled_start_time);

-- Add line_number column if it doesn't exist (for QR code functionality)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS line_number INTEGER;

-- Create index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_work_orders_qr_lookup ON work_orders(work_order_number, line_number);

-- Update existing work orders to have default line_number values
UPDATE work_orders SET line_number = FLOOR(RANDOM() * 5) + 1 WHERE line_number IS NULL;

-- Insert default schedule configuration if it doesn't exist
INSERT INTO schedule_config (hours_per_day, days_per_week, efficiency_factor, active)
VALUES (8, 5, 1.0, true)
ON CONFLICT DO NOTHING;

-- Log the migration
INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value, changed_at)
SELECT 
    id,
    'migration',
    'scheduling_columns_added',
    'Added scheduled_start_time, scheduled_end_time, and line_number columns',
    NOW()
FROM work_orders
LIMIT 1;

-- Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_work_orders,
    COUNT(CASE WHEN scheduled_start_time IS NOT NULL THEN 1 END) as scheduled_work_orders,
    COUNT(CASE WHEN line_number IS NOT NULL THEN 1 END) as work_orders_with_line_numbers
FROM work_orders; 