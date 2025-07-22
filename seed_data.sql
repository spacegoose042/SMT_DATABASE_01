-- Seed Data for SMT Production Schedule Database
-- Initial data for production lines, schedule configuration, and default settings

-- Insert default schedule configuration
INSERT INTO schedule_config (hours_per_day, days_per_week, efficiency_factor) 
VALUES (8, 5, 2.0);

-- Insert production lines based on CSV data and SMT_LINE_PROPERTIES.md
INSERT INTO production_lines (
    line_name, 
    line_type, 
    location_area, 
    max_capacity, 
    time_multiplier, 
    shifts_per_day, 
    hours_per_shift, 
    days_per_week, 
    lunch_break_duration, 
    lunch_break_start, 
    skill_level_required,
    status,
    active
) VALUES
-- Line 1: Takes twice as long as other lines
('1-EURO 264 (1)', 'EURO 264', 'Main Floor', 1, 2.0, 1, 8, 5, 60, '12:00:00', 'Standard', 'idle', true),

-- Lines 2-4: Standard timing
('2-EURO 127 (2)', 'EURO 127', 'Main Floor', 2, 1.0, 1, 8, 5, 60, '12:00:00', 'Standard', 'idle', true),
('3-EURO 588 (3)', 'EURO 588', 'Main Floor', 3, 1.0, 1, 8, 5, 60, '12:00:00', 'Standard', 'idle', true),
('4-EURO 586 (4) MCI', 'EURO 586', 'Main Floor', 4, 1.0, 1, 8, 5, 60, '12:00:00', 'Standard', 'idle', true),

-- Hand placement line (Line 5) - only used when manually specified
('Hand Placement', 'Hand', 'Main Floor', 1, 1.0, 1, 8, 5, 60, '12:00:00', 'Specialized', 'idle', true);

-- Insert default admin user (password should be changed after first login)
-- Note: This is a placeholder - in production, use proper password hashing
INSERT INTO users (username, email, password_hash, role, active) 
VALUES ('admin', 'admin@smt.com', 'placeholder_hash_change_me', 'admin', true);

-- Insert sample customers from CSV data
INSERT INTO customers (name, active) VALUES
('MCI', true),
('Ametek', true),
('Geoprobe', true),
('Chromalox', true),
('Tactical', true),
('R2R', true),
('Great Plains', true),
('Petro Power', true),
('Surefire', true),
('Redbird', true),
('Subsite', true),
('WOK', true),
('Karcher', true),
('PS Audio', true),
('Millenium', true),
('Colorado Times', true),
('Ushio', true),
('Accessible Tech', true),
('Braun', true),
('Bladewerx', true);

-- Insert sample assemblies from CSV data
INSERT INTO assemblies (customer_id, assembly_number, revision, description) 
SELECT 
    c.id,
    assembly_data.assembly_number,
    assembly_data.revision,
    assembly_data.description
FROM (
    VALUES 
    ('MCI', '9018649', 'B', 'MCI Assembly 9018649'),
    ('MCI', '9018371-1', 'B', 'MCI Assembly 9018371-1'),
    ('MCI', '9017915-1', 'N', 'MCI Assembly 9017915-1'),
    ('Ametek', 'CG302A-2639-2', 'D', 'Ametek Assembly CG302A-2639-2'),
    ('MCI', '9018575-2', 'D', 'MCI Assembly 9018575-2'),
    ('MCI', '9018575-1', 'D', 'MCI Assembly 9018575-1'),
    ('Geoprobe', '243553', '-', 'Geoprobe Assembly 243553'),
    ('Chromalox', '0113-10282', '09', 'Chromalox Assembly 0113-10282'),
    ('Tactical', 'PCA-10148-03', '3.1', 'Tactical Assembly PCA-10148-03'),
    ('R2R', 'SCU5H', 'G', 'R2R Assembly SCU5H'),
    ('Great Plains', '125199-03', 'B', 'Great Plains Assembly 125199-03'),
    ('Tactical', 'PCA-10190-01', '01', 'Tactical Assembly PCA-10190-01'),
    ('Tactical', 'PCA-10133-01', '01', 'Tactical Assembly PCA-10133-01'),
    ('Bladewerx', 'Annunciator', '4.6', 'Bladewerx Assembly Annunciator'),
    ('MCI', '9019311-1', 'A', 'MCI Assembly 9019311-1'),
    ('MCI', '9020050-5', 'D', 'MCI Assembly 9020050-5'),
    ('MCI', '9020050-6', 'D', 'MCI Assembly 9020050-6'),
    ('Petro Power', '5102', 'C', 'Petro Power Assembly 5102'),
    ('Surefire', '218-5024Y1', 'A3', 'Surefire Assembly 218-5024Y1'),
    ('Redbird', 'RBFS-Analog3', '1.1', 'Redbird Assembly RBFS-Analog3'),
    ('Subsite', '861-38015', 'V02', 'Subsite Assembly 861-38015'),
    ('WOK', '27000680', 'D', 'WOK Assembly 27000680'),
    ('Chromalox', '0113-10293', '03', 'Chromalox Assembly 0113-10293'),
    ('Chromalox', '0113-10294', '2', 'Chromalox Assembly 0113-10294'),
    ('Subsite', '934-0579', 'V01', 'Subsite Assembly 934-0579'),
    ('Subsite', '216-1305', 'V02', 'Subsite Assembly 216-1305'),
    ('Subsite', '216-1026', 'B', 'Subsite Assembly 216-1026'),
    ('Subsite', '216-1285', 'V02', 'Subsite Assembly 216-1285'),
    ('Subsite', '861-39632', 'V05', 'Subsite Assembly 861-39632'),
    ('Subsite', '861-21909', 'V03', 'Subsite Assembly 861-21909'),
    ('Karcher', '86452860', 'C', 'Karcher Assembly 86452860'),
    ('Subsite', '216-1090', 'V15', 'Subsite Assembly 216-1090'),
    ('MCI', '9019539-1', 'D', 'MCI Assembly 9019539-1'),
    ('R2R', 'ES2310599', 'A', 'R2R Assembly ES2310599'),
    ('PS Audio', 'MS-12-076-04-1', 'D', 'PS Audio Assembly MS-12-076-04-1'),
    ('Ametek', 'ML48B-1601-1', 'F', 'Ametek Assembly ML48B-1601-1'),
    ('PS Audio', 'MS-12-095-01-1', 'D4', 'PS Audio Assembly MS-12-095-01-1'),
    ('Millenium', 'MI-10136-CCA', 'AC-00', 'Millenium Assembly MI-10136-CCA'),
    ('Colorado Times', 'R-0066-5850A', 'A3', 'Colorado Times Assembly R-0066-5850A'),
    ('Ushio', 'T142-3001', '4', 'Ushio Assembly T142-3001'),
    ('Ushio', 'T207-3001', '5', 'Ushio Assembly T207-3001'),
    ('Accessible Tech', 'ATI001_PCBA', '.2', 'Accessible Tech Assembly ATI001_PCBA'),
    ('Braun', '35214A', 'NA', 'Braun Assembly 35214A'),
    ('MCI', '9017414-1', 'F', 'MCI Assembly 9017414-1'),
    ('MCI', '9018575-2', 'D', 'MCI Assembly 9018575-2 (Duplicate)'),
    ('Subsite', '861-36075', 'V02', 'Subsite Assembly 861-36075'),
    ('Subsite', '216-1323', '03', 'Subsite Assembly 216-1323')
) AS assembly_data(customer_name, assembly_number, revision, description)
JOIN customers c ON c.name = assembly_data.customer_name
WHERE c.active = true;

-- Initialize trolley management (assuming 20 trolleys available)
INSERT INTO trolley_management (trolley_number, current_status)
SELECT generate_series(1, 20), 'available';

-- Update production lines with calculated available capacity
UPDATE production_lines 
SET available_capacity = max_capacity - current_utilization
WHERE active = true; 