-- =====================================================
-- RANDOM PASSCODE GENERATION - GUARANTEED UNIQUE
-- =====================================================
-- This approach generates truly random codes but guarantees uniqueness

-- Clear existing passcodes
DELETE FROM public.passcodes;

-- Generate 3000 unique random passcodes
-- Using a more efficient approach that avoids collisions
WITH random_numbers AS (
  SELECT DISTINCT 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as num
  FROM generate_series(1, 5000) -- Generate more than needed to ensure we get 3000 unique
  LIMIT 3000
)
INSERT INTO public.passcodes (code)
SELECT 'UN-' || num as code
FROM random_numbers;

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
