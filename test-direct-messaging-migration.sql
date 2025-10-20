-- =====================================================
-- TEST SCRIPT FOR DIRECT MESSAGING MIGRATION
-- Run this AFTER the main migration to verify everything works
-- =====================================================

-- Test 1: Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 2: Verify constraints exist
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'chat_messages' 
AND table_schema = 'public';

-- Test 3: Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'chat_messages' 
AND schemaname = 'public';

-- Test 4: Test the helper function (if you have test data)
-- This will only work if you have users and connections
SELECT can_users_direct_message(
  '00000000-0000-0000-0000-000000000000'::UUID, 
  '00000000-0000-0000-0000-000000000001'::UUID
) as test_result;

-- Test 5: Verify existing data integrity
SELECT 
  message_context,
  COUNT(*) as message_count,
  COUNT(meeting_request_id) as with_meeting_id,
  COUNT(*) - COUNT(meeting_request_id) as null_meeting_id
FROM public.chat_messages 
GROUP BY message_context;

-- Test 6: Verify constraint works (this should fail)
-- Uncomment the lines below to test constraint enforcement
/*
INSERT INTO public.chat_messages (
  sender_id, 
  recipient_id, 
  message, 
  message_context, 
  meeting_request_id
) VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Test message',
  'meeting',
  NULL  -- This should fail due to constraint
);
*/

-- Test 7: Verify constraint works (this should also fail)
-- Uncomment the lines below to test constraint enforcement
/*
INSERT INTO public.chat_messages (
  sender_id, 
  recipient_id, 
  message, 
  message_context, 
  meeting_request_id
) VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Test message',
  'direct',
  '00000000-0000-0000-0000-000000000002'::UUID  -- This should fail due to constraint
);
*/

-- Test 8: Verify valid direct message can be inserted (if you have valid UUIDs)
-- Uncomment and modify the lines below to test valid direct message insertion
/*
INSERT INTO public.chat_messages (
  sender_id, 
  recipient_id, 
  message, 
  message_context, 
  meeting_request_id
) VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Test direct message',
  'direct',
  NULL  -- This should succeed
);
*/

RAISE NOTICE '✅ Test script completed. Check the results above.';
