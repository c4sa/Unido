-- =====================================================
-- CHECK EXISTING PASSCODES DATA
-- =====================================================
-- This script checks what data currently exists in the passcodes table

-- Check if passcodes table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'passcodes'
) as table_exists;

-- Check current constraint
SELECT 
  conname as constraint_name,
  consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.passcodes'::regclass 
AND conname = 'passcodes_code_check';

-- Check existing data format
SELECT 
  code,
  LENGTH(code) as code_length,
  code ~ '^UN-[0-9]{4}$' as matches_old_format,
  code ~ '^[0-9]{6}$' as matches_new_format
FROM public.passcodes 
ORDER BY created_date DESC 
LIMIT 10;

-- Count by format
SELECT 
  CASE 
    WHEN code ~ '^UN-[0-9]{4}$' THEN 'Old format (UN-XXXX)'
    WHEN code ~ '^[0-9]{6}$' THEN 'New format (XXXXXX)'
    ELSE 'Other format'
  END as format_type,
  COUNT(*) as count
FROM public.passcodes 
GROUP BY format_type;
