-- Update line_number field based on production line assignments
-- Line 1: 1-EURO 264 (1)
UPDATE work_orders 
SET line_number = 1 
WHERE line_id = (SELECT id FROM production_lines WHERE line_name = '1-EURO 264 (1)');

-- Line 2: 2-EURO 127 (2)  
UPDATE work_orders 
SET line_number = 2 
WHERE line_id = (SELECT id FROM production_lines WHERE line_name = '2-EURO 127 (2)');

-- Line 3: 3-EURO 588 (3)
UPDATE work_orders 
SET line_number = 3 
WHERE line_id = (SELECT id FROM production_lines WHERE line_name = '3-EURO 588 (3)');

-- Line 4: 4-EURO 586 (4) MCI
UPDATE work_orders 
SET line_number = 4 
WHERE line_id = (SELECT id FROM production_lines WHERE line_name = '4-EURO 586 (4) MCI');

-- Line 5: Hand Placement
UPDATE work_orders 
SET line_number = 5 
WHERE line_id = (SELECT id FROM production_lines WHERE line_name = 'Hand Placement');
