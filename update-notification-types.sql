-- =====================================================
-- UPDATE NOTIFICATION TYPES - Add Connection Notification Types
-- Fixes the constraint violation for connection-related notifications
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated constraint with new connection notification types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  -- Existing meeting-related notifications
  'new_meeting_request',
  'request_accepted', 
  'request_declined',
  'request_status_update',
  'meeting_updated',
  'new_message',
  'booking_confirmed',
  'booking_cancelled',
  
  -- New connection-related notifications
  'new_connection_request',
  'connection_accepted',
  'connection_declined'
));

-- Verify the constraint was updated
DO $$
BEGIN
  -- Test that new notification types are now allowed
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'notifications_type_check'
    AND check_clause LIKE '%new_connection_request%'
  ) THEN
    RAISE NOTICE 'SUCCESS: Notification types constraint updated successfully';
    RAISE NOTICE 'New connection notification types are now allowed:';
    RAISE NOTICE '  - new_connection_request';
    RAISE NOTICE '  - connection_accepted'; 
    RAISE NOTICE '  - connection_declined';
  ELSE
    RAISE EXCEPTION 'FAILED: Constraint was not updated properly';
  END IF;
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
