import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user1_id, user2_id } = req.query;

    // Validate required fields
    if (!user1_id || !user2_id) {
      return res.status(400).json({ error: 'Both user IDs are required' });
    }

    // Prevent querying messages with self
    if (user1_id === user2_id) {
      return res.status(400).json({ error: 'Cannot get messages with yourself' });
    }

    // Check if users are connected using the database function
    const { data: canMessage, error: connectionError } = await supabase
      .rpc('can_users_direct_message', {
        user1_id: user1_id,
        user2_id: user2_id
      });

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return res.status(500).json({ error: 'Failed to verify connection status' });
    }

    if (!canMessage) {
      return res.status(403).json({ error: 'You must be connected to this delegate to view direct messages' });
    }

    // Get direct messages between the two users (bidirectional)
    const { data: messages, error: messagesError } = await supabase
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
      .eq('message_context', 'direct')
      .or(`and(sender_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(sender_id.eq.${user2_id},recipient_id.eq.${user1_id})`)
      .order('created_date', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark messages as read for the requesting user (user1_id)
    const unreadMessages = (messages || []).filter(
      msg => msg.recipient_id === user1_id && !msg.read_status
    );

    if (unreadMessages.length > 0) {
      const unreadMessageIds = unreadMessages.map(msg => msg.id);
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ read_status: true })
        .in('id', unreadMessageIds);

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
        // Don't fail the request for read status update errors
      }
    }

    return res.status(200).json({
      success: true,
      messages: messages || [],
      total_count: (messages || []).length,
      unread_count: unreadMessages.length
    });

  } catch (error) {
    console.error('Get direct messages error:', error);
    return res.status(500).json({ 
      error: 'Failed to get direct messages', 
      details: error.message 
    });
  }
}
