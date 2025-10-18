-- =====================================================
-- FIX PASSWORD RESET OTPs TABLE - ADD MISSING COLUMN
-- =====================================================

-- Add the missing updated_date column to existing table
DO $$ 
BEGIN
    -- Check if updated_date column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_otps' 
        AND column_name = 'updated_date'
    ) THEN
        ALTER TABLE public.password_reset_otps 
        ADD COLUMN updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL;
        
        RAISE NOTICE 'Added updated_date column to password_reset_otps table';
    ELSE
        RAISE NOTICE 'updated_date column already exists in password_reset_otps table';
    END IF;
END $$;

-- Now add the trigger (this should work now)
DROP TRIGGER IF EXISTS trigger_password_reset_otps_updated_date ON public.password_reset_otps;

CREATE TRIGGER trigger_password_reset_otps_updated_date
  BEFORE UPDATE ON public.password_reset_otps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date();

-- Verify the fix
DO $$
DECLARE
  column_exists BOOLEAN;
  trigger_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'password_reset_otps' 
    AND column_name = 'updated_date'
  ) INTO column_exists;
  
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name = 'trigger_password_reset_otps_updated_date'
  ) INTO trigger_exists;
  
  IF column_exists AND trigger_exists THEN
    RAISE NOTICE '✅ Password Reset OTPs table fix completed successfully';
  ELSE
    RAISE EXCEPTION '❌ Fix incomplete - column exists: %, trigger exists: %', column_exists, trigger_exists;
  END IF;
END $$;
