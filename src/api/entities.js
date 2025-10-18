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
}

/**
 * Chat Message Entity
 */
class ChatMessageEntity extends SupabaseEntity {
  constructor() {
    super('chat_messages');
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

// Export entity instances (maintaining base44 API)
export const User = new UserEntity();
export const MeetingRequest = new MeetingRequestEntity();
export const ChatMessage = new ChatMessageEntity();
export const VenueBooking = new VenueBookingEntity();
export const Notification = new NotificationEntity();
export const VenueRoom = new VenueRoomEntity();
export const Passcode = new PasscodeEntity();

// Export supabase client for direct access when needed
export { supabase };
