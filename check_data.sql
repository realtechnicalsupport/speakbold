-- Check if user_xp table has data
SELECT COUNT(*) FROM user_xp;

-- Check if there are any recordings
SELECT COUNT(*) FROM recordings;

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_xp';
