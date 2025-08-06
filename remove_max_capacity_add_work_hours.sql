-- Migration: Remove max_capacity and enhance work hours configuration
-- Run this script to update the production_lines table

-- Remove max_capacity column
ALTER TABLE production_lines DROP COLUMN IF EXISTS max_capacity;

-- Add new work hours configuration fields
ALTER TABLE production_lines 
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS lunch_break_duration INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS lunch_break_start TIME DEFAULT '12:00:00',
ADD COLUMN IF NOT EXISTS auto_schedule_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS maintenance_interval_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS efficiency_target INTEGER DEFAULT 85;

-- Update existing lines with reasonable defaults if they don't have values
UPDATE production_lines SET 
    start_time = '08:00:00' WHERE start_time IS NULL,
    end_time = '17:00:00' WHERE end_time IS NULL,
    break_duration = 15 WHERE break_duration IS NULL,
    lunch_break_duration = 60 WHERE lunch_break_duration IS NULL,
    lunch_break_start = '12:00:00' WHERE lunch_break_start IS NULL,
    auto_schedule_enabled = true WHERE auto_schedule_enabled IS NULL,
    maintenance_interval_days = 30 WHERE maintenance_interval_days IS NULL,
    efficiency_target = 85 WHERE efficiency_target IS NULL;

-- Create a function to calculate available capacity based on work hours
CREATE OR REPLACE FUNCTION calculate_line_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate available capacity based on work hours configuration
    -- Formula: (shifts_per_day * hours_per_shift * days_per_week) - break time
    NEW.available_capacity = (
        NEW.shifts_per_day * 
        NEW.hours_per_shift * 
        NEW.days_per_week
    ) - (
        (NEW.lunch_break_duration + NEW.break_duration) * 
        NEW.shifts_per_day * 
        NEW.days_per_week / 60.0
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate available capacity
DROP TRIGGER IF EXISTS calculate_line_capacity_trigger ON production_lines;
CREATE TRIGGER calculate_line_capacity_trigger
    BEFORE INSERT OR UPDATE ON production_lines
    FOR EACH ROW
    EXECUTE FUNCTION calculate_line_capacity();

-- Update existing records to calculate their available capacity
UPDATE production_lines SET updated_at = NOW();

-- Log the migration
INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value, changed_at)
SELECT 
    id,
    'migration',
    'max_capacity_removed_work_hours_enhanced',
    'Removed max_capacity, added start_time, end_time, break_duration, lunch_break_duration, lunch_break_start, auto_schedule_enabled, maintenance_interval_days, efficiency_target',
    NOW()
FROM work_orders
LIMIT 1;

-- Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_production_lines,
    COUNT(CASE WHEN start_time IS NOT NULL THEN 1 END) as lines_with_start_time,
    COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as lines_with_end_time,
    COUNT(CASE WHEN break_duration IS NOT NULL THEN 1 END) as lines_with_break_duration,
    COUNT(CASE WHEN lunch_break_duration IS NOT NULL THEN 1 END) as lines_with_lunch_break_duration,
    COUNT(CASE WHEN lunch_break_start IS NOT NULL THEN 1 END) as lines_with_lunch_break_start,
    COUNT(CASE WHEN auto_schedule_enabled IS NOT NULL THEN 1 END) as lines_with_auto_schedule_enabled,
    COUNT(CASE WHEN maintenance_interval_days IS NOT NULL THEN 1 END) as lines_with_maintenance_interval_days,
    COUNT(CASE WHEN efficiency_target IS NOT NULL THEN 1 END) as lines_with_efficiency_target,
    AVG(available_capacity) as avg_available_capacity_hours
FROM production_lines; 