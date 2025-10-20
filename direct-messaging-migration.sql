-- =====================================================
-- DIRECT MESSAGING SYSTEM - DATABASE MIGRATION
-- Enables direct messaging between connected delegates
-- =====================================================

-- Safety check: Verify chat_messages table exists and has expected structure
DO $$
BEGIN
  -- Check if chat_messages table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'chat_messages' 
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'ERROR: chat_messages table does not exist. Please run the main schema migration first.';
  END IF;
  
  -- Check if meeting_request_id column exists and is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'meeting_request_id' 
    AND is_nullable = 'NO'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'ERROR: meeting_request_id column not found or already nullable. Migration may have already been run.';
  END IF;
  
  RAISE NOTICE 'Safety checks passed. Proceeding with migration...';
END $$;

-- Step 1: Make meeting_request_id nullable for direct messages
ALTER TABLE public.chat_messages 
ALTER COLUMN meeting_request_id DROP NOT NULL;

-- Step 2: Add message context type to differentiate direct vs meeting messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_context TEXT DEFAULT 'meeting' CHECK (message_context IN ('meeting', 'direct'));

-- Step 3: Add constraint to ensure data integrity (only if it doesn't exist)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_message_context' 
    AND table_name = 'chat_messages' 
    AND table_schema = 'public'
  ) THEN
    -- Add the constraint
    ALTER TABLE public.chat_messages 
    ADD CONSTRAINT valid_message_context CHECK (
      (message_context = 'meeting' AND meeting_request_id IS NOT NULL) OR 
      (message_context = 'direct' AND meeting_request_id IS NULL)
    );
  END IF;
END $$;

-- Step 4: Create index for direct message queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_chat_messages_direct 
ON public.chat_messages (sender_id, recipient_id, message_context, created_date) 
WHERE message_context = 'direct';

-- Step 5: Create index for bidirectional direct message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_direct_bidirectional 
ON public.chat_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), message_context, created_date) 
WHERE message_context = 'direct';

-- Step 6: Update existing records to have 'meeting' context (backward compatibility)
-- This ensures all existing chat messages are marked as 'meeting' type
UPDATE public.chat_messages 
SET message_context = 'meeting' 
WHERE message_context IS NULL AND meeting_request_id IS NOT NULL;

-- Verify that all existing messages have been properly categorized
DO $$
DECLARE
  uncategorized_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO uncategorized_count
  FROM public.chat_messages 
  WHERE message_context IS NULL;
  
  IF uncategorized_count > 0 THEN
    RAISE WARNING 'WARNING: Found % uncategorized messages. This should not happen.', uncategorized_count;
  ELSE
    RAISE NOTICE 'INFO: All existing messages properly categorized as meeting messages';
  END IF;
END $$;

-- Step 7: Create helper function to check if users can direct message
CREATE OR REPLACE FUNCTION can_users_direct_message(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if users are connected with accepted status
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

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.chat_messages.message_context IS 'Context of message: meeting (linked to meeting_request) or direct (between connected delegates)';
COMMENT ON FUNCTION can_users_direct_message(UUID, UUID) IS 'Check if two users can send direct messages (must be connected)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the migration worked
DO $$
BEGIN
  -- Check if message_context column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'chat_messages' 
             AND column_name = 'message_context' 
             AND table_schema = 'public') THEN
    RAISE NOTICE 'INFO: message_context column added successfully';
  ELSE
    RAISE EXCEPTION 'ERROR: message_context column not found';
  END IF;
  
  -- Check if meeting_request_id is nullable
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'chat_messages' 
             AND column_name = 'meeting_request_id' 
             AND is_nullable = 'YES'
             AND table_schema = 'public') THEN
    RAISE NOTICE 'INFO: meeting_request_id is now nullable';
  ELSE
    RAISE EXCEPTION 'ERROR: meeting_request_id is still NOT NULL';
  END IF;
  
  -- Check if helper function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_users_direct_message') THEN
    RAISE NOTICE 'INFO: can_users_direct_message function created successfully';
  ELSE
    RAISE EXCEPTION 'ERROR: can_users_direct_message function not found';
  END IF;
  
  -- Verify existing chat functionality is preserved
  -- Check that all existing messages still have meeting_request_id
  IF EXISTS (
    SELECT 1 FROM public.chat_messages 
    WHERE message_context = 'meeting' 
    AND meeting_request_id IS NULL
  ) THEN
    RAISE EXCEPTION 'ERROR: CRITICAL: Existing meeting messages have NULL meeting_request_id! This breaks existing functionality.';
  END IF;
  
  -- Check that no direct messages exist yet (they shouldn't until the feature is used)
  IF EXISTS (
    SELECT 1 FROM public.chat_messages 
    WHERE message_context = 'direct'
  ) THEN
    RAISE NOTICE 'INFO: Direct messages already exist in the database';
  ELSE
    RAISE NOTICE 'INFO: No direct messages found (expected for fresh migration)';
  END IF;
  
  RAISE NOTICE 'INFO: Direct messaging migration completed successfully!';
  RAISE NOTICE 'INFO: All existing chat functionality preserved';
  RAISE NOTICE 'INFO: Ready for direct messaging between connected delegates';
END $$;
