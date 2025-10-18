-- =====================================================
-- PASSWORD RESET OTP SYSTEM - DATABASE MIGRATION
-- =====================================================

-- 1. Create Password Reset OTPs Table
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL CHECK (otp_code ~ '^[0-9]{6}$'),
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_reset_otps_email') THEN
        CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_reset_otps_code') THEN
        CREATE INDEX idx_password_reset_otps_code ON public.password_reset_otps(otp_code);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_reset_otps_expires') THEN
        CREATE INDEX idx_password_reset_otps_expires ON public.password_reset_otps(expires_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_password_reset_otps_is_used') THEN
        CREATE INDEX idx_password_reset_otps_is_used ON public.password_reset_otps(is_used);
    END IF;
END $$;

-- 2. Create function to generate 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp_code()
RETURNS TEXT AS $$
BEGIN
  -- Generate random 6-digit number (000000-999999)
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to clean expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  -- Delete expired OTPs (older than 1 hour)
  DELETE FROM public.password_reset_otps 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to verify and use OTP
CREATE OR REPLACE FUNCTION verify_and_use_otp(
  p_email TEXT,
  p_otp_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  otp_record RECORD;
BEGIN
  -- Clean up expired OTPs first
  PERFORM cleanup_expired_otps();
  
  -- Check if OTP exists, is not used, and not expired
  SELECT * INTO otp_record
  FROM public.password_reset_otps
  WHERE email = p_email 
    AND otp_code = p_otp_code 
    AND is_used = FALSE 
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark OTP as used
  UPDATE public.password_reset_otps
  SET is_used = TRUE
  WHERE id = otp_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to store new OTP
CREATE OR REPLACE FUNCTION store_password_reset_otp(
  p_email TEXT,
  p_otp_code TEXT,
  p_expires_minutes INTEGER DEFAULT 60
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Clean up expired OTPs first
  PERFORM cleanup_expired_otps();
  
  -- Invalidate any existing unused OTPs for this email
  UPDATE public.password_reset_otps
  SET is_used = TRUE
  WHERE email = p_email AND is_used = FALSE;
  
  -- Insert new OTP
  INSERT INTO public.password_reset_otps (email, otp_code, expires_at)
  VALUES (
    p_email, 
    p_otp_code, 
    NOW() + INTERVAL '1 minute' * p_expires_minutes
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Disable RLS on password_reset_otps table (as per existing pattern)
ALTER TABLE public.password_reset_otps DISABLE ROW LEVEL SECURITY;

-- 7. Grant permissions
DO $$ 
BEGIN
    -- Grant table permissions
    GRANT ALL ON TABLE public.password_reset_otps TO authenticated, anon;
    
    -- Grant function permissions
    GRANT EXECUTE ON FUNCTION generate_otp_code() TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION cleanup_expired_otps() TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION verify_and_use_otp(TEXT, TEXT) TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION store_password_reset_otp(TEXT, TEXT, INTEGER) TO authenticated, anon;
EXCEPTION
    WHEN duplicate_object THEN
        -- Permissions already exist, ignore
        NULL;
END $$;

-- 8. Add updated_date trigger (consistent with existing tables)
CREATE TRIGGER trigger_password_reset_otps_updated_date
  BEFORE UPDATE ON public.password_reset_otps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date();

-- 9. Add comments for documentation
COMMENT ON TABLE public.password_reset_otps IS 'OTP codes for password reset functionality';
COMMENT ON COLUMN public.password_reset_otps.otp_code IS '6-digit numeric OTP code';
COMMENT ON COLUMN public.password_reset_otps.expires_at IS 'Expiration timestamp for the OTP (default 60 minutes)';

-- =====================================================
-- SCHEMA VALIDATION
-- =====================================================

-- Verify table exists
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'password_reset_otps'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'password_reset_otps table was not created successfully';
  END IF;
  
  RAISE NOTICE 'Password Reset OTP system migration completed successfully';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
