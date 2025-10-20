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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sender_id, recipient_id, message } = req.body;

    // Validate required fields
    if (!sender_id || !recipient_id || !message) {
      return res.status(400).json({ error: 'Sender ID, recipient ID, and message are required' });
    }

    // Validate message length
    if (message.length < 1 || message.length > 5000) {
      return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    }

    // Prevent self-messaging
    if (sender_id === recipient_id) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Check if users are connected using the database function
    const { data: canMessage, error: connectionError } = await supabase
      .rpc('can_users_direct_message', {
        user1_id: sender_id,
        user2_id: recipient_id
      });

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return res.status(500).json({ error: 'Failed to verify connection status' });
    }

    if (!canMessage) {
      return res.status(403).json({ error: 'You must be connected to this delegate to send direct messages' });
    }

    // Create the direct message
    const { data: newMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: sender_id,
        recipient_id: recipient_id,
        message: message,
        message_type: 'text',
        message_context: 'direct',
        meeting_request_id: null // Explicitly set to null for direct messages
      })
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
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Get recipient details for notification
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('full_name, notification_preferences')
      .eq('id', recipient_id)
      .single();

    if (!recipientError && recipient) {
      // Create notification for recipient (non-blocking)
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipient_id,
          type: 'new_message',
          title: 'New Direct Message',
          body: `You have a new direct message from ${newMessage.sender.full_name}.`,
          link: `/chat?type=direct&delegate=${sender_id}`,
          related_entity_id: newMessage.id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the message sending for notification errors
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Direct message sent successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Send direct message error:', error);
    return res.status(500).json({ 
      error: 'Failed to send direct message', 
      details: error.message 
    });
  }
}
