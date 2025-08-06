-- Migration: Add clear_to_build field to work_orders table
-- Run this script to add the clear to build functionality to existing database

-- Add clear_to_build column to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS clear_to_build BOOLEAN DEFAULT true;

-- Create index for clear_to_build queries (for scheduling performance)
CREATE INDEX IF NOT EXISTS idx_work_orders_clear_to_build ON work_orders(clear_to_build);

-- Update existing work orders to be clear to build by default
-- (assuming existing work orders are ready for production)
UPDATE work_orders SET clear_to_build = true WHERE clear_to_build IS NULL;

-- Log the migration
INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value, changed_at)
SELECT 
    id,
    'migration',
    'clear_to_build_added',
    'Added clear_to_build field with default true',
    NOW()
FROM work_orders
LIMIT 1;

-- Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_work_orders,
    COUNT(CASE WHEN clear_to_build = true THEN 1 END) as clear_to_build_yes,
    COUNT(CASE WHEN clear_to_build = false THEN 1 END) as clear_to_build_no
FROM work_orders; 