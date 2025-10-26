-- =====================================================
-- UPDATE PASSCODE CONSTRAINT FOR 6-DIGIT FORMAT
-- =====================================================
-- This migration updates the existing passcode constraint to allow 6-digit codes

-- Drop the existing constraint
ALTER TABLE public.passcodes DROP CONSTRAINT IF EXISTS passcodes_code_check;

-- Add the new constraint for 6-digit codes
ALTER TABLE public.passcodes ADD CONSTRAINT passcodes_code_check CHECK (code ~ '^[0-9]{6}$');

-- Update table comment
COMMENT ON TABLE public.passcodes IS 'One-time passcodes for new user registration - Format: xxxxxx (6 digits)';
COMMENT ON COLUMN public.passcodes.code IS 'Unique passcode in format xxxxxx where x are digits (6 digits total)';

-- Verify the constraint was updated
SELECT 
  conname as constraint_name,
  consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.passcodes'::regclass 
AND conname = 'passcodes_code_check';
