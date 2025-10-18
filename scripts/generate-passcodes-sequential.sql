-- =====================================================
-- SEQUENTIAL PASSCODE GENERATION - GUARANTEED UNIQUE
-- =====================================================
-- This approach generates all 3000 codes sequentially to guarantee uniqueness

-- Clear existing passcodes
DELETE FROM public.passcodes;

-- Generate 3000 unique passcodes using sequential approach
-- This ensures all codes are unique and generated efficiently
INSERT INTO public.passcodes (code)
SELECT 'UN-' || LPAD((1000 + ROW_NUMBER() OVER (ORDER BY RANDOM()))::TEXT, 4, '0') as code
FROM generate_series(1, 3000);

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
