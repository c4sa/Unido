import { supabase } from './supabaseClient';

/**
 * Base Entity Class
 * Provides common CRUD operations for Supabase tables
 * Maintains compatibility with base44 API
 */
class SupabaseEntity {
  constructor(tableName) {
    this.table = tableName;
  }

  /**
   * Parse orderBy string (base44 format: '-created_date' or 'created_date')
   * Returns { column, ascending }
   */
  parseOrderBy(orderBy = '-created_date') {
    if (!orderBy) return { column: 'created_date', ascending: false };
    
    const ascending = !orderBy.startsWith('-');
    const column = ascending ? orderBy : orderBy.substring(1);
    return { column, ascending };
  }

  /**
   * Apply filters to query builder
   */
  applyFilters(query, filters) {
    if (!filters) return query;

    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      
      // Handle different filter types
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Complex filter (e.g., { $in: [...] })
        if (value.$in && Array.isArray(value.$in)) {
          query = query.in(key, value.$in);
        }
      } else if (Array.isArray(value)) {
        // Array equality
        query = query.eq(key, value);
      } else {
        // Simple equality
        query = query.eq(key, value);
      }
    });

    return query;
  }

  /**
   * List all records with optional ordering
   */
  async list(orderBy = '-created_date') {
    const { column, ascending } = this.parseOrderBy(orderBy);
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .order(column, { ascending });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single record by ID
   */
  async get(id) {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new record
   */
  async create(data) {
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const { data: created, error } = await supabase
      .from(this.table)
      .insert(cleanData)
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  /**
   * Update a record by ID
   */
  async update(id, data) {
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const { data: updated, error } = await supabase
      .from(this.table)
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  /**
   * Delete a record by ID
   */
  async delete(id) {
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Filter records with conditions, ordering, and limit
   */
  async filter(filters = {}, orderBy = '-created_date', limit = null) {
    let query = supabase.from(this.table).select('*');

    // Apply filters
    query = this.applyFilters(query, filters);

    // Apply ordering
    const { column, ascending } = this.parseOrderBy(orderBy);
    query = query.order(column, { ascending });

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
}

/**
 * User Auth Entity
 * Handles authentication and user profile management
 */
class UserEntity {
  constructor() {
    this.entity = new SupabaseEntity('users');
  }

  /**
   * Get current authenticated user
   */
  async me() {
    // Get auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      throw new Error('Not authenticated');
    }

    // Get user profile from public.users
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      // If user profile doesn't exist, create it
      if (error.code === 'PGRST116') {
        const newUser = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          role: 'user'
        };
        
        const { data: created, error: createError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();
        
        if (createError) throw createError;
        return created;
      }
      throw error;
    }

    return data;
  }

  /**
   * List all users
   */
  async list(orderBy = '-created_date') {
    return this.entity.list(orderBy);
  }

  /**
   * Get user by ID
   */
  async get(id) {
    return this.entity.get(id);
  }

  /**
   * Update user profile
   */
  async update(id, data) {
    return this.entity.update(id, data);
  }

  /**
   * Update current user's profile
   */
  async updateMyUserData(data) {
    const user = await this.me();
    return this.update(user.id, data);
  }

  /**
   * Logout current user
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Redirect to login
    window.location.href = '/login';
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    return data;
  }
}

/**
 * Meeting Request Entity
 */
class MeetingRequestEntity extends SupabaseEntity {
  constructor() {
    super('meeting_requests');
  }

  /**
   * Override filter to handle recipient_ids array filtering
   */
  async filter(filters = {}, orderBy = '-created_date', limit = null) {
    let query = supabase.from(this.table).select('*');

    // Handle recipient_ids specially (array contains)
    if (filters.recipient_ids) {
      // Check if it's an array contains query
      if (filters.recipient_ids.$in && Array.isArray(filters.recipient_ids.$in)) {
        // User wants to find meetings where they are a recipient
        query = query.contains('recipient_ids', filters.recipient_ids.$in);
      }
      delete filters.recipient_ids;
    }

    // Apply other filters
    query = this.applyFilters(query, filters);

    // Apply ordering
    const { column, ascending } = this.parseOrderBy(orderBy);
    query = query.order(column, { ascending });

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Create meeting request with participants
   */
  async create(data) {
    try {
      // Create the meeting request first
      const meeting = await super.create(data);
      
      // Create participants using database function
      if (meeting && meeting.id) {
        const { error: participantsError } = await supabase
          .rpc('create_meeting_participants', {
            p_meeting_id: meeting.id,
            p_requester_id: data.requester_id,
            p_recipient_ids: data.recipient_ids
          });
          
        if (participantsError) {
          console.error('Error creating meeting participants:', participantsError);
          // Don't fail the meeting creation, but log the error
        }
      }
      
      return meeting;
    } catch (error) {
      console.error('Error creating meeting request:', error);
      throw error;
    }
  }

  /**
   * Get meeting with participant details
   */
  async getWithParticipants(meetingId) {
    try {
      const [meeting, participants] = await Promise.all([
        this.get(meetingId),
        this.getParticipants(meetingId)
      ]);
      
      return {
        ...meeting,
        participants: participants
      };
    } catch (error) {
      console.error('Error getting meeting with participants:', error);
      throw error;
    }
  }

  /**
   * Get participants for a meeting
   */
  async getParticipants(meetingId) {
    try {
      const { data, error } = await supabase
        .from('meeting_participants')
        .select(`
          *,
          participant:users!participant_id (
            id,
            full_name,
            organization,
            job_title,
            country
          )
        `)
        .eq('meeting_request_id', meetingId)
        .order('created_date');
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting meeting participants:', error);
      throw error;
    }
  }

  /**
   * Get meeting acceptance status
   */
  async getAcceptanceStatus(meetingId) {
    try {
      const { data, error } = await supabase
        .rpc('get_meeting_acceptance_status', {
          p_meeting_id: meetingId
        });
        
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error getting meeting acceptance status:', error);
      throw error;
    }
  }

  /**
   * Respond to meeting as participant
   */
  async respondAsParticipant(meetingId, participantId, response) {
    try {
      const { data, error } = await supabase
        .rpc('respond_to_meeting', {
          p_meeting_id: meetingId,
          p_participant_id: participantId,
          p_response: response
        });
        
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error responding to meeting:', error);
      throw error;
    }
  }

  /**
   * Get accepted participants for a meeting
   */
  async getAcceptedParticipants(meetingId) {
    try {
      const { data, error } = await supabase
        .rpc('get_accepted_participants', {
          p_meeting_id: meetingId
        });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting accepted participants:', error);
      throw error;
    }
  }
}

/**
 * Chat Message Entity
 */
class ChatMessageEntity extends SupabaseEntity {
  constructor() {
    super('chat_messages');
  }

  /**
   * Check if user can access chat for a meeting
   */
  async canAccessMeetingChat(meetingId, userId) {
    try {
      // Get meeting details
      const meeting = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('id', meetingId)
        .single();
        
      if (meeting.error) throw meeting.error;
      
      const meetingData = meeting.data;
      
      // For single meetings, use original logic
      if (meetingData.meeting_type === 'single') {
        return meetingData.status === 'accepted' && 
               (meetingData.requester_id === userId || 
                (meetingData.recipient_ids || []).includes(userId));
      }
      
      // For group meetings, check if user is an accepted participant
      if (meetingData.meeting_type === 'multi') {
        try {
          const { data: participant, error: participantError } = await supabase
            .from('meeting_participants')
            .select('response_status')
            .eq('meeting_request_id', meetingId)
            .eq('participant_id', userId)
            .eq('response_status', 'accepted')
            .single();
            
          if (participantError) {
            // If meeting_participants table doesn't exist or no record found,
            // fall back to checking if user is in recipient_ids and meeting is accepted
            console.warn('meeting_participants table access failed, using fallback:', participantError);
            return meetingData.status === 'accepted' && 
                   (meetingData.requester_id === userId || 
                    (meetingData.recipient_ids || []).includes(userId));
          }
          
          return !!participant; // User must be an accepted participant
        } catch (error) {
          // Fallback to original logic if meeting_participants table doesn't exist
          console.warn('meeting_participants table not available, using fallback');
          return meetingData.status === 'accepted' && 
                 (meetingData.requester_id === userId || 
                  (meetingData.recipient_ids || []).includes(userId));
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking chat access:', error);
      return false;
    }
  }

  /**
   * Get chat participants for a meeting
   */
  async getChatParticipants(meetingId) {
    try {
      const meeting = await supabase
        .from('meeting_requests')
        .select('meeting_type, requester_id, recipient_ids')
        .eq('id', meetingId)
        .single();
        
      if (meeting.error) throw meeting.error;
      
      const meetingData = meeting.data;
      
      // For single meetings, return requester and recipient
      if (meetingData.meeting_type === 'single') {
        const participantIds = [meetingData.requester_id, ...meetingData.recipient_ids];
        
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, organization')
          .in('id', participantIds);
          
        if (usersError) throw usersError;
        return users || [];
      }
      
      // For group meetings, return only accepted participants
      if (meetingData.meeting_type === 'multi') {
        try {
          const { data: participants, error: participantsError } = await supabase
            .from('meeting_participants')
            .select(`
              participant_id,
              participant:users!participant_id (
                id,
                full_name,
                organization
              )
            `)
            .eq('meeting_request_id', meetingId)
            .eq('response_status', 'accepted');
            
          if (participantsError) {
            // Fallback: if meeting_participants table doesn't exist, use all participants
            console.warn('meeting_participants table access failed, using fallback for participants');
            const participantIds = [meetingData.requester_id, ...meetingData.recipient_ids];
            
            const { data: users, error: usersError } = await supabase
              .from('users')
              .select('id, full_name, organization')
              .in('id', participantIds);
              
            if (usersError) throw usersError;
            return users || [];
          }
          
          return (participants || []).map(p => p.participant);
        } catch (error) {
          // Fallback: use all participants from meeting_requests table
          console.warn('meeting_participants table not available, using fallback for participants');
          const participantIds = [meetingData.requester_id, ...meetingData.recipient_ids];
          
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, full_name, organization')
            .in('id', participantIds);
            
          if (usersError) throw usersError;
          return users || [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting chat participants:', error);
      return [];
    }
  }

  /**
   * Send message to group chat
   */
  async sendGroupMessage(meetingId, senderId, message) {
    try {
      // Verify sender can access this chat
      const canAccess = await this.canAccessMeetingChat(meetingId, senderId);
      if (!canAccess) {
        throw new Error('You do not have access to this chat');
      }
      
      // Get all accepted participants except sender
      const participants = await this.getChatParticipants(meetingId);
      const recipients = participants.filter(p => p.id !== senderId);
      
      if (recipients.length === 0) {
        throw new Error('No other participants in this chat');
      }
      
      // Create message data for all recipients (without metadata column)
      const messageDataArray = recipients.map(recipient => ({
        meeting_request_id: meetingId,
        sender_id: senderId,
        recipient_id: recipient.id,
        message: message,
        message_type: 'text'
      }));
      
      // Insert all messages in a single batch operation
      const { data: createdMessages, error } = await supabase
        .from('chat_messages')
        .insert(messageDataArray)
        .select();
        
      if (error) throw error;
      
      return createdMessages || [];
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a meeting chat
   */
  async getMeetingMessages(meetingId, userId) {
    try {
      // Verify user can access this chat
      const canAccess = await this.canAccessMeetingChat(meetingId, userId);
      if (!canAccess) {
        throw new Error('You do not have access to this chat');
      }
      
      // Get meeting type to determine message filtering strategy
      const { data: meeting, error: meetingError } = await supabase
        .from('meeting_requests')
        .select('meeting_type')
        .eq('id', meetingId)
        .single();
        
      if (meetingError) throw meetingError;
      
      let messages = [];
      
      if (meeting.meeting_type === 'single') {
        // Single chat: get messages where user is sender or recipient
        const { data: singleMessages, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            sender:users!sender_id (
              id,
              full_name
            ),
            recipient:users!recipient_id (
              id,
              full_name
            )
          `)
          .eq('meeting_request_id', meetingId)
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_date');
          
        if (error) throw error;
        messages = singleMessages || [];
      } else {
        // Group chat: get ALL messages for this meeting, but deduplicate using improved algorithm
        const { data: groupMessages, error } = await supabase
          .from('chat_messages')
          .select(`
            *,
            sender:users!sender_id (
              id,
              full_name
            ),
            recipient:users!recipient_id (
              id,
              full_name
            )
          `)
          .eq('meeting_request_id', meetingId)
          .order('created_date');
          
        if (error) throw error;
        
        // Improved deduplication for group messages (without metadata dependency)
        const uniqueMessages = [];
        const seen = new Set();
        
        (groupMessages || []).forEach(msg => {
          // Create robust deduplication key using content and timestamp
          const messageTime = new Date(msg.created_date).getTime();
          const contentHash = btoa(unescape(encodeURIComponent(msg.message.trim()))).slice(0, 12);
          const deduplicationKey = `${msg.sender_id}-${contentHash}-${Math.floor(messageTime / 300)}`; // 300ms window
          
          if (!seen.has(deduplicationKey)) {
            seen.add(deduplicationKey);
            uniqueMessages.push(msg);
          }
        });
        
        messages = uniqueMessages;
      }
      
      return messages;
    } catch (error) {
      console.error('Error getting meeting messages:', error);
      throw error;
    }
  }
}

/**
 * Venue Booking Entity
 */
class VenueBookingEntity extends SupabaseEntity {
  constructor() {
    super('venue_bookings');
  }
}

/**
 * Notification Entity
 */
class NotificationEntity extends SupabaseEntity {
  constructor() {
    super('notifications');
  }
}

/**
 * Venue Room Entity
 */
class VenueRoomEntity extends SupabaseEntity {
  constructor() {
    super('venue_rooms');
  }
}

/**
 * Passcode Entity
 * Handles one-time passcode verification
 */
class PasscodeEntity extends SupabaseEntity {
  constructor() {
    super('passcodes');
  }

  async verifyCode(code, email) {
    // Frontend calls backend API instead of direct database access
    const response = await fetch('/api/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Verification failed');
    }
    
    return await response.json();
  }
}

/**
 * Connection Entity
 * Handles delegate connection requests and relationships
 */
class ConnectionEntity extends SupabaseEntity {
  constructor() {
    super('delegate_connections');
  }

  /**
   * Send a connection request to another delegate
   */
  async sendConnectionRequest(recipientId, message = '') {
    const apiUrl = import.meta.env.DEV 
      ? 'http://localhost:3000/api/send-connection-request'
      : '/api/send-connection-request';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recipient_id: recipientId,
        connection_message: message 
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send connection request');
    }
    
    return await response.json();
  }

  /**
   * Respond to a connection request (accept/decline)
   */
  async respondToConnectionRequest(connectionId, response) {
    const apiUrl = import.meta.env.DEV 
      ? 'http://localhost:3000/api/respond-connection-request'
      : '/api/respond-connection-request';
      
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        connection_id: connectionId,
        response: response // 'accepted' or 'declined'
      })
    });
    
    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(error.error || 'Failed to respond to connection request');
    }
    
    return await apiResponse.json();
  }

  /**
   * Get user's connections (both sent and received)
   */
  async getUserConnections(userId) {
    const apiUrl = import.meta.env.DEV 
      ? `http://localhost:3000/api/user-connections?user_id=${userId}`
      : `/api/user-connections?user_id=${userId}`;
      
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user connections');
    }
    
    return await response.json();
  }

  /**
   * Check if current user is connected to another user
   */
  async areUsersConnected(userId1, userId2) {
    const apiUrl = import.meta.env.DEV 
      ? `http://localhost:3000/api/check-connection?user1=${userId1}&user2=${userId2}`
      : `/api/check-connection?user1=${userId1}&user2=${userId2}`;
      
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check connection status');
    }
    
    const result = await response.json();
    return result.connected;
  }

  /**
   * Validate connections for group meeting
   */
  async validateGroupMeetingConnections(requesterId, recipientIds) {
    const apiUrl = import.meta.env.DEV 
      ? 'http://localhost:3000/api/validate-group-connections'
      : '/api/validate-group-connections';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        requester_id: requesterId,
        recipient_ids: recipientIds
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate group connections');
    }
    
    return await response.json();
  }
}

// Export entity instances (maintaining base44 API)
export const User = new UserEntity();
export const MeetingRequest = new MeetingRequestEntity();
export const ChatMessage = new ChatMessageEntity();
export const VenueBooking = new VenueBookingEntity();
export const Notification = new NotificationEntity();
export const VenueRoom = new VenueRoomEntity();
export const Passcode = new PasscodeEntity();
export const Connection = new ConnectionEntity();

// Export supabase client for direct access when needed
export { supabase };
