-- =====================================================
-- CONNECTIONS SYSTEM - DATABASE MIGRATION
-- Adds connection request functionality between delegates
-- =====================================================

-- =====================================================
-- TABLE: delegate_connections
-- Manages connection requests and relationships between delegates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.delegate_connections (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT,
  
  -- Connection details
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  
  -- Message from requester
  connection_message TEXT CHECK (length(connection_message) <= 500),
  
  -- Prevent duplicate connections and self-connections
  CONSTRAINT no_self_connection CHECK (requester_id != recipient_id),
  CONSTRAINT unique_connection_pair UNIQUE (requester_id, recipient_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding connections by requester
CREATE INDEX IF NOT EXISTS idx_delegate_connections_requester 
ON public.delegate_connections(requester_id);

-- Index for finding connections by recipient
CREATE INDEX IF NOT EXISTS idx_delegate_connections_recipient 
ON public.delegate_connections(recipient_id);

-- Index for finding connections by status
CREATE INDEX IF NOT EXISTS idx_delegate_connections_status 
ON public.delegate_connections(status);

-- Composite index for finding user's connections
CREATE INDEX IF NOT EXISTS idx_delegate_connections_user_status 
ON public.delegate_connections(requester_id, recipient_id, status);

-- =====================================================
-- TRIGGER FOR UPDATED_DATE
-- =====================================================

-- Create trigger to update updated_date on each row update
CREATE TRIGGER trigger_delegate_connections_updated_date
  BEFORE UPDATE ON public.delegate_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date();

-- =====================================================
-- HELPER FUNCTIONS FOR CONNECTION MANAGEMENT
-- =====================================================

-- Function to check if two users are connected
CREATE OR REPLACE FUNCTION are_users_connected(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.delegate_connections 
    WHERE status = 'accepted' 
    AND (
      (requester_id = user1_id AND recipient_id = user2_id) OR
      (requester_id = user2_id AND recipient_id = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's connections (both directions)
CREATE OR REPLACE FUNCTION get_user_connections(user_id UUID)
RETURNS TABLE (
  connection_id UUID,
  connected_user_id UUID,
  connection_status TEXT,
  connection_created_date TIMESTAMPTZ,
  is_requester BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id as connection_id,
    CASE 
      WHEN dc.requester_id = user_id THEN dc.recipient_id
      ELSE dc.requester_id
    END as connected_user_id,
    dc.status as connection_status,
    dc.created_date as connection_created_date,
    (dc.requester_id = user_id) as is_requester
  FROM public.delegate_connections dc
  WHERE (dc.requester_id = user_id OR dc.recipient_id = user_id)
  ORDER BY dc.created_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate group meeting connections
CREATE OR REPLACE FUNCTION validate_group_meeting_connections(requester_id UUID, recipient_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  is_connected BOOLEAN
) AS $$
DECLARE
  recipient_id UUID;
BEGIN
  FOREACH recipient_id IN ARRAY recipient_ids
  LOOP
    RETURN QUERY
    SELECT 
      recipient_id as user_id,
      are_users_connected(requester_id, recipient_id) as is_connected;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DISABLE ROW LEVEL SECURITY (As per project requirements)
-- =====================================================
ALTER TABLE public.delegate_connections DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.delegate_connections IS 'Connection requests and relationships between delegates';
COMMENT ON COLUMN public.delegate_connections.requester_id IS 'User who sent the connection request';
COMMENT ON COLUMN public.delegate_connections.recipient_id IS 'User who received the connection request';
COMMENT ON COLUMN public.delegate_connections.status IS 'Status of connection: pending, accepted, declined';
COMMENT ON COLUMN public.delegate_connections.connection_message IS 'Optional message from requester explaining why they want to connect';

COMMENT ON FUNCTION are_users_connected(UUID, UUID) IS 'Check if two users have an accepted connection (bidirectional)';
COMMENT ON FUNCTION get_user_connections(UUID) IS 'Get all connections for a user (both sent and received)';
COMMENT ON FUNCTION validate_group_meeting_connections(UUID, UUID[]) IS 'Validate if requester is connected to all recipients for group meeting';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'delegate_connections'
  ) THEN
    RAISE NOTICE 'Table delegate_connections created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create delegate_connections table';
  END IF;
END $$;

-- Verify functions were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'are_users_connected'
  ) THEN
    RAISE NOTICE 'Function are_users_connected created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create are_users_connected function';
  END IF;
END $$;

RAISE NOTICE 'Connections system migration completed successfully!';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
