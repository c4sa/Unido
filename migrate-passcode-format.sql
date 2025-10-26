-- =====================================================
-- MIGRATE PASSCODE FORMAT FROM UN-XXXX TO XXXXXX
-- =====================================================
-- This migration safely converts existing passcodes and updates the constraint

-- Step 1: Check if there are any existing passcodes
DO $$
DECLARE
  passcode_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO passcode_count FROM public.passcodes;
  
  IF passcode_count > 0 THEN
    RAISE NOTICE 'Found % existing passcodes. Converting format...', passcode_count;
    
    -- Convert old format (UN-XXXX) to new format (XXXXXX)
    UPDATE public.passcodes 
    SET code = SUBSTRING(code FROM 4)  -- Remove 'UN-' prefix, keep the 4 digits
    WHERE code ~ '^UN-[0-9]{4}$';
    
    -- Check if any codes don't match the new format
    IF EXISTS (SELECT 1 FROM public.passcodes WHERE code !~ '^[0-9]{6}$') THEN
      RAISE NOTICE 'Some passcodes still don''t match 6-digit format. Converting...';
      
      -- For any remaining codes that aren't 6 digits, pad with zeros or truncate
      UPDATE public.passcodes 
      SET code = LPAD(REGEXP_REPLACE(code, '[^0-9]', '', 'g'), 6, '0')
      WHERE code !~ '^[0-9]{6}$';
    END IF;
    
    RAISE NOTICE 'Passcode format conversion completed.';
  ELSE
    RAISE NOTICE 'No existing passcodes found.';
  END IF;
END $$;

-- Step 2: Drop the old constraint
ALTER TABLE public.passcodes DROP CONSTRAINT IF EXISTS passcodes_code_check;

-- Step 3: Add the new constraint for 6-digit codes
ALTER TABLE public.passcodes ADD CONSTRAINT passcodes_code_check CHECK (code ~ '^[0-9]{6}$');

-- Step 4: Update table comments
COMMENT ON TABLE public.passcodes IS 'One-time passcodes for new user registration - Format: xxxxxx (6 digits)';
COMMENT ON COLUMN public.passcodes.code IS 'Unique passcode in format xxxxxx where x are digits (6 digits total)';

-- Step 5: Verify the migration
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_passcodes,
  COUNT(CASE WHEN code ~ '^[0-9]{6}$' THEN 1 END) as valid_6_digit_codes,
  COUNT(CASE WHEN code !~ '^[0-9]{6}$' THEN 1 END) as invalid_codes
FROM public.passcodes;

-- Show sample of converted codes
SELECT code, is_used, created_date 
FROM public.passcodes 
ORDER BY created_date DESC 
LIMIT 5;
