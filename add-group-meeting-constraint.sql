-- =====================================================
-- ADD UNIQUE CONSTRAINT FOR GROUP MEETING REQUESTS
-- =====================================================
-- This migration prevents duplicate group meeting requests between the same participants

-- Create a partial unique index to prevent duplicate group meeting requests
-- This ensures only one pending group meeting request can exist between the same participants at a time
CREATE UNIQUE INDEX unique_group_meeting_request 
ON public.meeting_requests (requester_id, recipient_ids) 
WHERE status = 'pending' AND meeting_type = 'multi';

-- Add comment explaining the index
COMMENT ON INDEX unique_group_meeting_request 
IS 'Prevents duplicate pending group meeting requests between the same participants. Only one pending group request allowed per participant set.';

-- Verify the index was created
SELECT 
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes 
WHERE tablename = 'meeting_requests' 
AND indexname = 'unique_group_meeting_request';
