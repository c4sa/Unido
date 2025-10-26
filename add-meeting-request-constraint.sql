-- =====================================================
-- ADD UNIQUE INDEX FOR PENDING MEETING REQUESTS
-- =====================================================
-- This migration prevents duplicate pending meeting requests between the same users
-- Uses a partial unique index since PostgreSQL doesn't support WHERE clauses in UNIQUE constraints

-- Create a partial unique index to prevent duplicate pending requests
-- This ensures only one pending meeting request can exist between any two users at a time
CREATE UNIQUE INDEX unique_pending_meeting_request 
ON public.meeting_requests (requester_id, recipient_ids) 
WHERE status = 'pending';

-- Add comment explaining the index
COMMENT ON INDEX unique_pending_meeting_request 
IS 'Prevents duplicate pending meeting requests between the same users. Only one pending request allowed per user pair.';

-- Verify the index was created
SELECT 
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes 
WHERE tablename = 'meeting_requests' 
AND indexname = 'unique_pending_meeting_request';
