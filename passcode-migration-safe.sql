-- =====================================================
-- PASSCODE REGISTRATION SYSTEM - SAFE MIGRATION
-- =====================================================

-- 1. Drop existing objects if they exist
DROP FUNCTION IF EXISTS generate_passcodes(INTEGER);
DROP FUNCTION IF EXISTS verify_and_use_passcode(TEXT, TEXT, UUID);
DROP TABLE IF EXISTS public.passcodes CASCADE;

-- 2. Create Passcodes Table
CREATE TABLE public.passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^UN-[0-9]{4}$'),
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_passcodes_code ON public.passcodes(code);
CREATE INDEX idx_passcodes_is_used ON public.passcodes(is_used);

-- 3. Update Users Table (safe approach)
DO $$ 
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_password_reset') THEN
        ALTER TABLE public.users ADD COLUMN is_password_reset BOOLEAN DEFAULT TRUE NOT NULL;
    END IF;
END $$;

-- Set existing users to false (they don't need reset)
UPDATE public.users SET is_password_reset = FALSE WHERE is_password_reset IS NULL;

-- 4. Create Passcode Generation Function (Improved)
CREATE OR REPLACE FUNCTION generate_passcodes(count INTEGER DEFAULT 3000)
RETURNS void AS $$
DECLARE
  i INTEGER := 0;
  new_code TEXT;
  max_attempts INTEGER := count * 10; -- Allow 10x attempts to prevent infinite loops
  attempts INTEGER := 0;
BEGIN
  -- Clear existing passcodes first to ensure clean generation
  DELETE FROM public.passcodes;
  
  WHILE i < count AND attempts < max_attempts LOOP
    attempts := attempts + 1;
    
    -- Generate random 4-digit number (0000-9999)
    new_code := 'UN-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.passcodes WHERE code = new_code) THEN
      INSERT INTO public.passcodes (code) VALUES (new_code);
      i := i + 1;
    END IF;
  END LOOP;
  
  -- If we couldn't generate enough codes, raise an error
  IF i < count THEN
    RAISE EXCEPTION 'Could only generate % out of % requested passcodes after % attempts', i, count, attempts;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to verify and use passcode
CREATE OR REPLACE FUNCTION verify_and_use_passcode(
  p_code TEXT,
  p_email TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  passcode_record RECORD;
BEGIN
  -- Check if passcode exists and is not used
  SELECT * INTO passcode_record
  FROM public.passcodes
  WHERE code = p_code AND is_used = FALSE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark passcode as used
  UPDATE public.passcodes
  SET 
    is_used = TRUE,
    used_by = p_user_id,
    used_at = NOW()
  WHERE code = p_code;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Disable RLS on passcodes table (as per existing pattern)
ALTER TABLE public.passcodes DISABLE ROW LEVEL SECURITY;

-- 7. Grant permissions
GRANT ALL ON TABLE public.passcodes TO authenticated, anon;
GRANT ALL ON FUNCTION generate_passcodes(INTEGER) TO authenticated, anon;
GRANT ALL ON FUNCTION verify_and_use_passcode(TEXT, TEXT, UUID) TO authenticated, anon;

-- 8. Add comments for documentation
COMMENT ON TABLE public.passcodes IS 'One-time passcodes for new user registration - Format: UN-xxxx';
COMMENT ON COLUMN public.passcodes.code IS 'Unique passcode in format UN-xxxx where x are digits';
COMMENT ON COLUMN public.passcodes.is_used IS 'Whether the passcode has been used for registration';
COMMENT ON COLUMN public.passcodes.used_by IS 'User ID who used this passcode';
COMMENT ON COLUMN public.users.is_password_reset IS 'Whether user needs to reset password on first login';

-- 9. Generate initial passcodes (uncomment to run)
-- SELECT generate_passcodes(3000);
