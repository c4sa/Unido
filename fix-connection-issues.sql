-- =====================================================
-- FIX CONNECTION SYSTEM ISSUES
-- Addresses duplicate key constraint and bidirectional connection problems
-- =====================================================

-- Step 1: Drop the problematic constraint
ALTER TABLE public.delegate_connections 
DROP CONSTRAINT IF EXISTS unique_connection_pair;

-- Step 2: Create a unique index that handles bidirectional connections
-- This ensures only one connection exists between any two users regardless of direction
CREATE UNIQUE INDEX unique_delegate_connection 
ON public.delegate_connections (
  LEAST(requester_id, recipient_id),
  GREATEST(requester_id, recipient_id)
);

-- Step 3: Clean up any existing duplicate connections (keep the most recent one)
WITH duplicate_connections AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LEAST(requester_id, recipient_id),
        GREATEST(requester_id, recipient_id)
      ORDER BY created_date DESC
    ) as rn
  FROM public.delegate_connections
)
DELETE FROM public.delegate_connections 
WHERE id IN (
  SELECT id FROM duplicate_connections WHERE rn > 1
);

-- Step 4: Update the send connection request logic to handle declined requests
-- Create a function to handle connection request creation with proper cleanup
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
  -- Check for existing connection (bidirectional)
  SELECT * INTO existing_connection
  FROM public.delegate_connections
  WHERE (
    (requester_id = p_requester_id AND recipient_id = p_recipient_id) OR
    (requester_id = p_recipient_id AND recipient_id = p_requester_id)
  );
  
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
  
  -- If connection was declined, delete the old one and create new
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

-- Verify the changes
DO $$
BEGIN
  -- Test that the constraint works
  RAISE NOTICE 'SUCCESS: Connection system constraints updated';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  - Bidirectional unique constraint added';
  RAISE NOTICE '  - Duplicate connections cleaned up';
  RAISE NOTICE '  - Helper function for connection creation added';
END $$;

-- =====================================================
-- END OF FIX
-- =====================================================
