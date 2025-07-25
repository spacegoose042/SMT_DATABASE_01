-- Add line_number values to existing work orders for QR code generation
-- Run this script in your Railway PostgreSQL console

-- Ensure line_number column exists
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS line_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_work_orders_qr_lookup ON work_orders(work_order_number, line_number);

-- Add random line numbers (1-5) to work orders without line_number
UPDATE work_orders SET line_number = 4 WHERE work_order_number = '14966.2' AND line_number IS NULL;
UPDATE work_orders SET line_number = 2 WHERE work_order_number = '14872.1' AND line_number IS NULL;
UPDATE work_orders SET line_number = 4 WHERE work_order_number = '14568.1' AND line_number IS NULL;
UPDATE work_orders SET line_number = 4 WHERE work_order_number = '14795.2' AND line_number IS NULL;
UPDATE work_orders SET line_number = 4 WHERE work_order_number = '14793.2' AND line_number IS NULL;
UPDATE work_orders SET line_number = 4 WHERE work_order_number = '14739.1' AND line_number IS NULL;
UPDATE work_orders SET line_number = 4 WHERE work_order_number = '14411.2' AND line_number IS NULL;
UPDATE work_orders SET line_number = 2 WHERE work_order_number = '14414.2' AND line_number IS NULL;
UPDATE work_orders SET line_number = 3 WHERE work_order_number = '14596.1' AND line_number IS NULL;
UPDATE work_orders SET line_number = 5 WHERE work_order_number = '14594.1' AND line_number IS NULL;

-- Verify the updates
SELECT work_order_number, line_number, CONCAT(work_order_number, '-', line_number) as qr_code FROM work_orders WHERE line_number IS NOT NULL LIMIT 10;