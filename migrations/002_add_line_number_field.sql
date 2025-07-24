-- Migration: 002_add_line_number_field.sql
-- Description: Add line_number field to work_orders table for QR code generation
-- Date: 2025-01-24
-- Author: SMT Database Team

-- Add line_number field to work_orders table
ALTER TABLE work_orders 
ADD COLUMN line_number INTEGER;

-- Add index for QR code lookups (work_order_number + line_number combination)
CREATE INDEX idx_work_orders_qr_lookup ON work_orders(work_order_number, line_number);

-- Add comment explaining the field
COMMENT ON COLUMN work_orders.line_number IS 'Line number for QR code generation (format: work_order_number-line_number)'; 