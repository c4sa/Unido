-- Test if the direct messaging migration has been run
-- Run this in Supabase SQL Editor to check migration status

-- Check if message_context column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name = 'message_context'
AND table_schema = 'public';

-- Check if meeting_request_id is nullable
SELECT 
  column_name, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name = 'meeting_request_id'
AND table_schema = 'public';

-- Check if helper function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'can_users_direct_message';

-- Check if constraint exists
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'chat_messages' 
AND constraint_name = 'valid_message_context'
AND table_schema = 'public';

-- Test the helper function (this will fail if users don't exist, but that's OK)
SELECT can_users_direct_message(
  '00000000-0000-0000-0000-000000000000'::UUID, 
  '00000000-0000-0000-0000-000000000001'::UUID
) as test_result;
