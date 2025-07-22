-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for SMT Production Schedule Database
-- Date: 2025-01-27
-- Author: SMT Database Team

-- This migration creates the complete initial schema for the SMT production scheduling system
-- It includes all tables, indexes, triggers, functions, and views needed for the system

-- Enable UUID extension for better ID management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'scheduler', 'viewer');
CREATE TYPE work_order_status AS ENUM ('1st Side Ready', 'Ready', 'Ready*', 'Missing TSM-125-01-L-DV', 'Completed', 'Cancelled');
CREATE TYPE line_status AS ENUM ('running', 'idle', 'setup', 'maintenance', 'down');
CREATE TYPE line_status_reason AS ENUM ('maintenance', 'malfunction', 'scheduled_downtime', 'estimated_repair', 'other');

-- 1. Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Assemblies table
CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    assembly_number VARCHAR(255) NOT NULL,
    revision VARCHAR(50),
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, assembly_number, revision)
);

-- 3. Production Lines table (based on SMT_LINE_PROPERTIES.md)
CREATE TABLE production_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_name VARCHAR(255) NOT NULL UNIQUE,
    line_type VARCHAR(100),
    location_area VARCHAR(100),
    max_capacity INTEGER NOT NULL,
    time_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Line 1 has 2.0, others 1.0
    current_utilization DECIMAL(5,2) DEFAULT 0.0, -- percentage
    active BOOLEAN DEFAULT true,
    status line_status DEFAULT 'idle',
    status_reason line_status_reason,
    status_start_time TIMESTAMP WITH TIME ZONE,
    expected_return_time TIMESTAMP WITH TIME ZONE,
    shifts_per_day INTEGER DEFAULT 1,
    hours_per_shift INTEGER DEFAULT 8,
    days_per_week INTEGER DEFAULT 5,
    lunch_break_duration INTEGER DEFAULT 60, -- minutes
    lunch_break_start TIME DEFAULT '12:00:00',
    skill_level_required VARCHAR(50),
    current_queue_length INTEGER DEFAULT 0,
    available_capacity INTEGER,
    next_available_slot TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Work Orders table (main table)
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(50) NOT NULL UNIQUE,
    assembly_id UUID NOT NULL REFERENCES assemblies(id),
    quantity INTEGER NOT NULL,
    status work_order_status NOT NULL DEFAULT 'Ready',
    kit_date DATE,
    ship_date DATE,
    setup_hours_estimated DECIMAL(8,2),
    production_time_minutes_estimated DECIMAL(8,2),
    production_time_hours_estimated DECIMAL(8,2),
    production_time_days_estimated DECIMAL(8,2),
    setup_hours_actual DECIMAL(8,2),
    production_time_minutes_actual DECIMAL(8,2),
    production_time_hours_actual DECIMAL(8,2),
    production_time_days_actual DECIMAL(8,2),
    completion_date TIMESTAMP WITH TIME ZONE,
    trolley_number INTEGER,
    line_id UUID REFERENCES production_lines(id),
    line_position INTEGER,
    is_hand_placed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ship_date_after_kit_date CHECK (ship_date IS NULL OR kit_date IS NULL OR ship_date >= kit_date),
    CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- 6. Schedule Configuration table
CREATE TABLE schedule_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hours_per_day INTEGER NOT NULL DEFAULT 8,
    days_per_week INTEGER NOT NULL DEFAULT 5,
    efficiency_factor DECIMAL(3,2) NOT NULL DEFAULT 2.0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Work Order History table (audit trail)
CREATE TABLE work_order_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id),
    user_id UUID REFERENCES users(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Line Time Blocks table (for maintenance, repairs, etc.)
CREATE TABLE line_time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_id UUID NOT NULL REFERENCES production_lines(id),
    block_type VARCHAR(50) NOT NULL, -- maintenance, repair, scheduled_downtime
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    estimated_repair_time INTEGER, -- minutes
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT time_block_duration CHECK (end_time > start_time)
);

-- 9. Trolley Management table
CREATE TABLE trolley_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trolley_number INTEGER NOT NULL UNIQUE,
    current_status VARCHAR(50) DEFAULT 'available', -- available, in_use, maintenance
    assigned_work_order_id UUID REFERENCES work_orders(id),
    line_id UUID REFERENCES production_lines(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    expected_return TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_work_orders_number ON work_orders(work_order_number);
CREATE INDEX idx_work_orders_ship_date ON work_orders(ship_date);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_line_id ON work_orders(line_id);
CREATE INDEX idx_work_orders_customer ON work_orders(assembly_id);
CREATE INDEX idx_assemblies_customer ON assemblies(customer_id);
CREATE INDEX idx_work_order_history_wo_id ON work_order_history(work_order_id);
CREATE INDEX idx_work_order_history_changed_at ON work_order_history(changed_at);
CREATE INDEX idx_production_lines_status ON production_lines(status);
CREATE INDEX idx_production_lines_active ON production_lines(active);
CREATE INDEX idx_line_time_blocks_line_id ON line_time_blocks(line_id);
CREATE INDEX idx_line_time_blocks_time_range ON line_time_blocks(start_time, end_time);
CREATE INDEX idx_trolley_management_number ON trolley_management(trolley_number);
CREATE INDEX idx_trolley_management_status ON trolley_management(current_status);

-- Composite indexes for common queries
CREATE INDEX idx_work_orders_line_date ON work_orders(line_id, ship_date);
CREATE INDEX idx_work_orders_status_date ON work_orders(status, ship_date);
CREATE INDEX idx_assemblies_customer_number ON assemblies(customer_id, assembly_number);
CREATE INDEX idx_work_orders_trolley_status ON work_orders(trolley_number, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assemblies_updated_at BEFORE UPDATE ON assemblies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_lines_updated_at BEFORE UPDATE ON production_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_config_updated_at BEFORE UPDATE ON schedule_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_line_time_blocks_updated_at BEFORE UPDATE ON line_time_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trolley_management_updated_at BEFORE UPDATE ON trolley_management FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log work order changes
CREATE OR REPLACE FUNCTION log_work_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log changes for each column
        IF OLD.work_order_number IS DISTINCT FROM NEW.work_order_number THEN
            INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value)
            VALUES (NEW.id, 'work_order_number', OLD.work_order_number, NEW.work_order_number);
        END IF;
        
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value)
            VALUES (NEW.id, 'status', OLD.status::text, NEW.status::text);
        END IF;
        
        IF OLD.ship_date IS DISTINCT FROM NEW.ship_date THEN
            INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value)
            VALUES (NEW.id, 'ship_date', OLD.ship_date::text, NEW.ship_date::text);
        END IF;
        
        IF OLD.line_id IS DISTINCT FROM NEW.line_id THEN
            INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value)
            VALUES (NEW.id, 'line_id', OLD.line_id::text, NEW.line_id::text);
        END IF;
        
        IF OLD.production_time_hours_actual IS DISTINCT FROM NEW.production_time_hours_actual THEN
            INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value)
            VALUES (NEW.id, 'production_time_hours_actual', OLD.production_time_hours_actual::text, NEW.production_time_hours_actual::text);
        END IF;
        
        IF OLD.completion_date IS DISTINCT FROM NEW.completion_date THEN
            INSERT INTO work_order_history (work_order_id, field_name, old_value, new_value)
            VALUES (NEW.id, 'completion_date', OLD.completion_date::text, NEW.completion_date::text);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for work order history logging
CREATE TRIGGER log_work_order_changes_trigger 
    AFTER UPDATE ON work_orders 
    FOR EACH ROW EXECUTE FUNCTION log_work_order_changes();

-- Create function to update line utilization
CREATE OR REPLACE FUNCTION update_line_utilization()
RETURNS TRIGGER AS $$
BEGIN
    -- Update line utilization when work orders are assigned/unassigned
    IF TG_OP = 'UPDATE' THEN
        IF OLD.line_id IS DISTINCT FROM NEW.line_id THEN
            -- Decrease utilization on old line
            IF OLD.line_id IS NOT NULL THEN
                UPDATE production_lines 
                SET current_utilization = GREATEST(0, current_utilization - 1),
                    current_queue_length = GREATEST(0, current_queue_length - 1)
                WHERE id = OLD.line_id;
            END IF;
            
            -- Increase utilization on new line
            IF NEW.line_id IS NOT NULL THEN
                UPDATE production_lines 
                SET current_utilization = LEAST(max_capacity, current_utilization + 1),
                    current_queue_length = current_queue_length + 1
                WHERE id = NEW.line_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        -- Increase utilization on new line assignment
        IF NEW.line_id IS NOT NULL THEN
            UPDATE production_lines 
            SET current_utilization = LEAST(max_capacity, current_utilization + 1),
                current_queue_length = current_queue_length + 1
            WHERE id = NEW.line_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrease utilization when work order is deleted
        IF OLD.line_id IS NOT NULL THEN
            UPDATE production_lines 
            SET current_utilization = GREATEST(0, current_utilization - 1),
                current_queue_length = GREATEST(0, current_queue_length - 1)
            WHERE id = OLD.line_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger for line utilization updates
CREATE TRIGGER update_line_utilization_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON work_orders 
    FOR EACH ROW EXECUTE FUNCTION update_line_utilization();

-- Create views for common reports

-- View for line schedules
CREATE VIEW line_schedules AS
SELECT 
    pl.line_name,
    pl.line_type,
    pl.status as line_status,
    wo.work_order_number,
    c.name as customer_name,
    a.assembly_number,
    a.revision,
    wo.quantity,
    wo.status,
    wo.kit_date,
    wo.ship_date,
    wo.production_time_hours_estimated,
    wo.production_time_hours_actual,
    wo.line_position,
    wo.trolley_number,
    wo.setup_hours_estimated
FROM work_orders wo
JOIN assemblies a ON wo.assembly_id = a.id
JOIN customers c ON a.customer_id = c.id
LEFT JOIN production_lines pl ON wo.line_id = pl.id
WHERE wo.status != 'Completed'
ORDER BY pl.line_name, wo.ship_date, wo.line_position;

-- View for trolley usage
CREATE VIEW trolley_usage AS
SELECT 
    wo.trolley_number,
    COUNT(*) as active_jobs,
    SUM(wo.quantity) as total_quantity,
    MIN(wo.ship_date) as earliest_ship_date,
    MAX(wo.ship_date) as latest_ship_date,
    STRING_AGG(DISTINCT pl.line_name, ', ') as assigned_lines
FROM work_orders wo
LEFT JOIN production_lines pl ON wo.line_id = pl.id
WHERE wo.status != 'Completed' AND wo.trolley_number IS NOT NULL
GROUP BY wo.trolley_number
ORDER BY wo.trolley_number;

-- View for line performance (actual vs estimated)
CREATE VIEW line_performance AS
SELECT 
    pl.line_name,
    COUNT(*) as total_jobs,
    AVG(wo.production_time_hours_actual) as avg_actual_hours,
    AVG(wo.production_time_hours_estimated) as avg_estimated_hours,
    AVG(wo.production_time_hours_actual - wo.production_time_hours_estimated) as avg_variance_hours,
    AVG(wo.setup_hours_actual) as avg_setup_hours_actual,
    AVG(wo.setup_hours_estimated) as avg_setup_hours_estimated
FROM work_orders wo
JOIN production_lines pl ON wo.line_id = pl.id
WHERE wo.production_time_hours_actual IS NOT NULL
GROUP BY pl.line_name, pl.id
ORDER BY pl.line_name;

-- View for line capacity and utilization
CREATE VIEW line_capacity AS
SELECT 
    pl.line_name,
    pl.line_type,
    pl.max_capacity,
    pl.current_utilization,
    pl.current_queue_length,
    pl.available_capacity,
    pl.next_available_slot,
    pl.status as line_status,
    pl.status_reason,
    pl.expected_return_time,
    ROUND((pl.current_utilization::DECIMAL / pl.max_capacity) * 100, 2) as utilization_percentage
FROM production_lines pl
WHERE pl.active = true
ORDER BY pl.line_name;

-- View for customer work orders
CREATE VIEW customer_work_orders AS
SELECT 
    c.name as customer_name,
    COUNT(*) as total_work_orders,
    COUNT(CASE WHEN wo.status = 'Completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN wo.status != 'Completed' THEN 1 END) as active_orders,
    SUM(wo.quantity) as total_quantity,
    AVG(wo.production_time_hours_actual) as avg_actual_hours,
    MIN(wo.ship_date) as earliest_ship_date,
    MAX(wo.ship_date) as latest_ship_date
FROM work_orders wo
JOIN assemblies a ON wo.assembly_id = a.id
JOIN customers c ON a.customer_id = c.id
GROUP BY c.name, c.id
ORDER BY c.name; 