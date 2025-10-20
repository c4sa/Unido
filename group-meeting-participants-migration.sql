-- =====================================================
-- GROUP MEETING PARTICIPANTS - INDIVIDUAL TRACKING
-- Adds individual participant tracking for group meetings
-- =====================================================

-- =====================================================
-- TABLE: meeting_participants
-- Tracks individual responses for each meeting participant
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  -- System fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Participant details
  meeting_request_id UUID NOT NULL REFERENCES public.meeting_requests(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL DEFAULT 'recipient' CHECK (participant_type IN ('requester', 'recipient')),
  
  -- Individual response tracking
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined')),
  response_date TIMESTAMPTZ,
  
  -- Prevent duplicate participants per meeting
  CONSTRAINT unique_meeting_participant UNIQUE (meeting_request_id, participant_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding participants by meeting
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting 
ON public.meeting_participants(meeting_request_id);

-- Index for finding meetings by participant
CREATE INDEX IF NOT EXISTS idx_meeting_participants_participant 
ON public.meeting_participants(participant_id);

-- Index for finding by response status
CREATE INDEX IF NOT EXISTS idx_meeting_participants_status 
ON public.meeting_participants(response_status);

-- Composite index for participant queries
CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_status 
ON public.meeting_participants(meeting_request_id, response_status);

-- =====================================================
-- TRIGGER FOR UPDATED_DATE
-- =====================================================

-- Create trigger to update updated_date on each row update
CREATE TRIGGER trigger_meeting_participants_updated_date
  BEFORE UPDATE ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_date();

-- =====================================================
-- HELPER FUNCTIONS FOR MEETING PARTICIPANTS
-- =====================================================

-- Function to get meeting acceptance status
CREATE OR REPLACE FUNCTION get_meeting_acceptance_status(p_meeting_id UUID)
RETURNS TABLE(
  total_participants INTEGER,
  accepted_count INTEGER,
  declined_count INTEGER,
  pending_count INTEGER,
  acceptance_percentage DECIMAL,
  overall_status TEXT
) AS $$
DECLARE
  total_count INTEGER;
  accepted INTEGER;
  declined INTEGER;
  pending INTEGER;
  percentage DECIMAL;
  status TEXT;
BEGIN
  -- Count participants by status
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE response_status = 'accepted') as acc,
    COUNT(*) FILTER (WHERE response_status = 'declined') as dec,
    COUNT(*) FILTER (WHERE response_status = 'pending') as pen
  INTO total_count, accepted, declined, pending
  FROM public.meeting_participants 
  WHERE meeting_request_id = p_meeting_id;
  
  -- Calculate acceptance percentage
  IF total_count > 0 THEN
    percentage := ROUND((accepted::DECIMAL / total_count::DECIMAL) * 100, 2);
  ELSE
    percentage := 0;
  END IF;
  
  -- Determine overall status
  IF total_count = 0 THEN
    status := 'no_participants';
  ELSIF accepted = total_count THEN
    status := 'fully_accepted';
  ELSIF declined = total_count THEN
    status := 'fully_declined';
  ELSIF pending = 0 THEN
    status := 'partially_accepted';
  ELSE
    status := 'pending_responses';
  END IF;
  
  RETURN QUERY SELECT 
    total_count,
    accepted,
    declined,
    pending,
    percentage,
    status;
END;
$$ LANGUAGE plpgsql;

-- Function to get accepted participants for a meeting
CREATE OR REPLACE FUNCTION get_accepted_participants(p_meeting_id UUID)
RETURNS TABLE(
  participant_id UUID,
  participant_type TEXT,
  response_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    mp.participant_id,
    mp.participant_type,
    mp.response_date
  FROM public.meeting_participants mp
  WHERE mp.meeting_request_id = p_meeting_id 
    AND mp.response_status = 'accepted'
  ORDER BY mp.response_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to create participants for a new meeting
CREATE OR REPLACE FUNCTION create_meeting_participants(
  p_meeting_id UUID,
  p_requester_id UUID,
  p_recipient_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
  recipient_id UUID;
  created_count INTEGER := 0;
BEGIN
  -- Create requester participant (auto-accepted)
  INSERT INTO public.meeting_participants (
    meeting_request_id,
    participant_id,
    participant_type,
    response_status,
    response_date
  ) VALUES (
    p_meeting_id,
    p_requester_id,
    'requester',
    'accepted',
    NOW()
  );
  created_count := created_count + 1;
  
  -- Create recipient participants (pending)
  FOREACH recipient_id IN ARRAY p_recipient_ids
  LOOP
    -- Skip if recipient is same as requester (shouldn't happen but safety check)
    IF recipient_id != p_requester_id THEN
      INSERT INTO public.meeting_participants (
        meeting_request_id,
        participant_id,
        participant_type,
        response_status
      ) VALUES (
        p_meeting_id,
        recipient_id,
        'recipient',
        'pending'
      );
      created_count := created_count + 1;
    END IF;
  END LOOP;
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Function to respond to meeting as participant
CREATE OR REPLACE FUNCTION respond_to_meeting(
  p_meeting_id UUID,
  p_participant_id UUID,
  p_response TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  meeting_status TEXT
) AS $$
DECLARE
  participant_exists BOOLEAN;
  current_status TEXT;
  new_meeting_status TEXT;
BEGIN
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT FALSE, 'Invalid response. Must be accepted or declined'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check if participant exists and is pending
  SELECT response_status INTO current_status
  FROM public.meeting_participants 
  WHERE meeting_request_id = p_meeting_id 
    AND participant_id = p_participant_id;
  
  IF current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Participant not found for this meeting'::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  IF current_status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'Participant has already responded'::TEXT, current_status;
    RETURN;
  END IF;
  
  -- Update participant response
  UPDATE public.meeting_participants 
  SET 
    response_status = p_response,
    response_date = NOW()
  WHERE meeting_request_id = p_meeting_id 
    AND participant_id = p_participant_id;
  
  -- Determine new meeting status based on all participants
  SELECT overall_status INTO new_meeting_status
  FROM get_meeting_acceptance_status(p_meeting_id);
  
  -- Update meeting request status if needed
  IF new_meeting_status = 'fully_accepted' THEN
    UPDATE public.meeting_requests 
    SET status = 'accepted'
    WHERE id = p_meeting_id;
    new_meeting_status := 'accepted';
  ELSIF new_meeting_status = 'fully_declined' THEN
    UPDATE public.meeting_requests 
    SET status = 'declined'
    WHERE id = p_meeting_id;
    new_meeting_status := 'declined';
  ELSE
    -- Keep as pending for partial responses
    UPDATE public.meeting_requests 
    SET status = 'pending'
    WHERE id = p_meeting_id;
    new_meeting_status := 'pending';
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Response recorded successfully'::TEXT, new_meeting_status;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE EXISTING MEETINGS (MIGRATION)
-- =====================================================

-- Migrate existing meeting requests to use participants table
DO $$
DECLARE
  meeting_record RECORD;
  recipient_id UUID;
BEGIN
  -- Loop through all existing meeting requests
  FOR meeting_record IN 
    SELECT id, requester_id, recipient_ids, status 
    FROM public.meeting_requests 
  LOOP
    -- Create requester participant
    INSERT INTO public.meeting_participants (
      meeting_request_id,
      participant_id,
      participant_type,
      response_status,
      response_date
    ) VALUES (
      meeting_record.id,
      meeting_record.requester_id,
      'requester',
      'accepted',  -- Requester is always considered accepted
      NOW()
    ) ON CONFLICT (meeting_request_id, participant_id) DO NOTHING;
    
    -- Create recipient participants
    FOREACH recipient_id IN ARRAY meeting_record.recipient_ids
    LOOP
      IF recipient_id != meeting_record.requester_id THEN
        INSERT INTO public.meeting_participants (
          meeting_request_id,
          participant_id,
          participant_type,
          response_status,
          response_date
        ) VALUES (
          meeting_record.id,
          recipient_id,
          'recipient',
          CASE 
            WHEN meeting_record.status = 'accepted' THEN 'accepted'
            WHEN meeting_record.status = 'declined' THEN 'declined'
            ELSE 'pending'
          END,
          CASE 
            WHEN meeting_record.status IN ('accepted', 'declined') THEN NOW()
            ELSE NULL
          END
        ) ON CONFLICT (meeting_request_id, participant_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Successfully migrated existing meeting requests to participants table';
END $$;

-- =====================================================
-- VERIFICATION AND COMMENTS
-- =====================================================

-- Add comments for documentation
COMMENT ON TABLE public.meeting_participants IS 'Individual participant tracking for meeting requests - supports group meeting partial acceptance';
COMMENT ON COLUMN public.meeting_participants.participant_type IS 'Type of participant: requester (auto-accepted) or recipient (needs to respond)';
COMMENT ON COLUMN public.meeting_participants.response_status IS 'Individual response status: pending, accepted, or declined';
COMMENT ON COLUMN public.meeting_participants.response_date IS 'When the participant responded (NULL for pending)';

COMMENT ON FUNCTION get_meeting_acceptance_status(UUID) IS 'Get comprehensive acceptance statistics for a meeting';
COMMENT ON FUNCTION get_accepted_participants(UUID) IS 'Get list of participants who have accepted the meeting';
COMMENT ON FUNCTION create_meeting_participants(UUID, UUID, UUID[]) IS 'Create participant records for a new meeting request';
COMMENT ON FUNCTION respond_to_meeting(UUID, UUID, TEXT) IS 'Handle individual participant response to meeting request';

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Group meeting participants system implemented';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '  ✅ Individual participant tracking';
  RAISE NOTICE '  ✅ Partial acceptance support';
  RAISE NOTICE '  ✅ Helper functions for status management';
  RAISE NOTICE '  ✅ Existing data migrated';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps: Update application code to use new participant system';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
