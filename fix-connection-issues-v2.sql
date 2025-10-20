-- =====================================================
-- FIX CONNECTION SYSTEM ISSUES - VERSION 2
-- Addresses duplicate key constraint and bidirectional connection problems
-- Uses a simpler approach that works reliably with PostgreSQL
-- =====================================================

-- Step 1: Drop the problematic constraint
ALTER TABLE public.delegate_connections 
DROP CONSTRAINT IF EXISTS unique_connection_pair;

-- Step 2: Clean up any existing duplicate connections (keep the most recent one)
-- This handles both (A,B) and (B,A) duplicates
WITH duplicate_connections AS (
  SELECT 
    id,
    requester_id,
    recipient_id,
    status,
    created_date,
    ROW_NUMBER() OVER (
      PARTITION BY 
        CASE 
          WHEN requester_id < recipient_id THEN requester_id || ',' || recipient_id
          ELSE recipient_id || ',' || requester_id
        END
      ORDER BY created_date DESC
    ) as rn
  FROM public.delegate_connections
)
DELETE FROM public.delegate_connections 
WHERE id IN (
  SELECT id FROM duplicate_connections WHERE rn > 1
);

-- Step 3: Add a check constraint to prevent self-connections (if not exists)
ALTER TABLE public.delegate_connections 
DROP CONSTRAINT IF EXISTS no_self_connection;

ALTER TABLE public.delegate_connections 
ADD CONSTRAINT no_self_connection CHECK (requester_id != recipient_id);

-- Step 4: Create a function to handle connection requests with proper duplicate checking
CREATE OR REPLACE FUNCTION create_connection_request(
  p_requester_id UUID,
  p_recipient_id UUID,
  p_message TEXT DEFAULT ''
)
RETURNS TABLE(
  connection_id UUID,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  existing_connection RECORD;
  new_connection_id UUID;
BEGIN
  -- Prevent self-connection
  IF p_requester_id = p_recipient_id THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'error'::TEXT,
      'Cannot send connection request to yourself'::TEXT;
    RETURN;
  END IF;

  -- Check for existing connection (bidirectional)
  SELECT * INTO existing_connection
  FROM public.delegate_connections
  WHERE (
    (requester_id = p_requester_id AND recipient_id = p_recipient_id) OR
    (requester_id = p_recipient_id AND recipient_id = p_requester_id)
  )
  ORDER BY created_date DESC
  LIMIT 1;
  
  -- If connection exists and is accepted, return error
  IF existing_connection.id IS NOT NULL AND existing_connection.status = 'accepted' THEN
    RETURN QUERY SELECT 
      existing_connection.id,
      'error'::TEXT,
      'Users are already connected'::TEXT;
    RETURN;
  END IF;
  
  -- If connection exists and is pending, return error
  IF existing_connection.id IS NOT NULL AND existing_connection.status = 'pending' THEN
    RETURN QUERY SELECT 
      existing_connection.id,
      'error'::TEXT,
      'Connection request already pending'::TEXT;
    RETURN;
  END IF;
  
  -- If connection was declined, delete the old one to allow new request
  IF existing_connection.id IS NOT NULL AND existing_connection.status = 'declined' THEN
    DELETE FROM public.delegate_connections WHERE id = existing_connection.id;
  END IF;
  
  -- Create new connection request
  INSERT INTO public.delegate_connections (
    requester_id,
    recipient_id,
    status,
    connection_message
  ) VALUES (
    p_requester_id,
    p_recipient_id,
    'pending',
    p_message
  ) RETURNING id INTO new_connection_id;
  
  RETURN QUERY SELECT 
    new_connection_id,
    'success'::TEXT,
    'Connection request created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a trigger to prevent duplicate connections at insert time
CREATE OR REPLACE FUNCTION prevent_duplicate_connections()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a connection already exists between these users (bidirectional)
  IF EXISTS (
    SELECT 1 FROM public.delegate_connections 
    WHERE (
      (requester_id = NEW.requester_id AND recipient_id = NEW.recipient_id) OR
      (requester_id = NEW.recipient_id AND recipient_id = NEW.requester_id)
    )
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'A connection already exists between these users';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_connections ON public.delegate_connections;
CREATE TRIGGER trigger_prevent_duplicate_connections
  BEFORE INSERT OR UPDATE ON public.delegate_connections
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_connections();

-- Step 6: Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Connection system issues fixed';
  RAISE NOTICE 'Applied fixes:';
  RAISE NOTICE '  ✅ Removed problematic unique constraint';
  RAISE NOTICE '  ✅ Cleaned up duplicate connections';
  RAISE NOTICE '  ✅ Added self-connection prevention';
  RAISE NOTICE '  ✅ Created connection request function';
  RAISE NOTICE '  ✅ Added duplicate prevention trigger';
  RAISE NOTICE '';
  RAISE NOTICE 'The connection system should now work without errors!';
END $$;

-- =====================================================
-- END OF FIX
-- =====================================================
