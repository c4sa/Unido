-- =====================================================
-- RESET PASSCODES TO 6-DIGIT FORMAT
-- =====================================================
-- This script deletes existing passcodes and sets up 6-digit format

-- Step 1: Delete all existing passcodes
DELETE FROM public.passcodes;

-- Step 2: Drop the old constraint
ALTER TABLE public.passcodes DROP CONSTRAINT IF EXISTS passcodes_code_check;

-- Step 3: Add the new constraint for 6-digit codes
ALTER TABLE public.passcodes ADD CONSTRAINT passcodes_code_check CHECK (code ~ '^[0-9]{6}$');

-- Step 4: Update table comments
COMMENT ON TABLE public.passcodes IS 'One-time passcodes for new user registration - Format: xxxxxx (6 digits)';
COMMENT ON COLUMN public.passcodes.code IS 'Unique passcode in format xxxxxx where x are digits (6 digits total)';

-- Step 5: Generate 3000 unique random passcodes
WITH random_numbers AS (
  SELECT DISTINCT 
    LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') as num
  FROM generate_series(1, 5000) -- Generate more than needed to ensure we get 3000 unique
  LIMIT 3000
)
INSERT INTO public.passcodes (code)
SELECT num as code
FROM random_numbers;

-- Step 6: Verify the generation
SELECT 
  COUNT(*) as total_passcodes,
  COUNT(CASE WHEN is_used = false THEN 1 END) as unused_passcodes,
  COUNT(CASE WHEN is_used = true THEN 1 END) as used_passcodes
FROM passcodes;

-- Step 7: Show some sample passcodes
SELECT code, is_used, created_date 
FROM passcodes 
ORDER BY created_date DESC 
LIMIT 10;
