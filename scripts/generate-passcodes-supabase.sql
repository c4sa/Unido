-- =====================================================
-- GENERATE PASSCODES - SUPABASE SQL SCRIPT
-- =====================================================
-- Run this directly in Supabase SQL Editor to generate 3000 passcodes

-- Generate 3000 unique passcodes
SELECT generate_passcodes(3000);

-- Verify the generation
SELECT 
  COUNT(*) as total_passcodes,
  COUNT(CASE WHEN is_used = false THEN 1 END) as unused_passcodes,
  COUNT(CASE WHEN is_used = true THEN 1 END) as used_passcodes
FROM passcodes;

-- Show some sample passcodes
SELECT code, is_used, created_date 
FROM passcodes 
ORDER BY created_date DESC 
LIMIT 10;
