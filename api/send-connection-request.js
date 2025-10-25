import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
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
    const { recipient_id, connection_message = '' } = req.body;

    // Validate required fields
    if (!recipient_id) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Get current user from auth header (in production, this would come from JWT)
    // For now, we'll need to pass requester_id in the request
    const { requester_id } = req.body;
    if (!requester_id) {
      return res.status(400).json({ error: 'Requester ID is required' });
    }

    // Validate that users exist
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('id', [requester_id, recipient_id]);

    if (usersError) {
      console.error('Error checking users:', usersError);
      return res.status(500).json({ error: 'Failed to validate users' });
    }

    if (users.length !== 2) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    // Prevent self-connection
    if (requester_id === recipient_id) {
      return res.status(400).json({ error: 'Cannot send connection request to yourself' });
    }

    // Check if connection already exists (in either direction)
    const { data: existingConnection, error: checkError } = await supabase
      .from('delegate_connections')
      .select('id, status')
      .or(`and(requester_id.eq.${requester_id},recipient_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},recipient_id.eq.${requester_id})`);

    if (checkError) {
      console.error('Error checking existing connection:', checkError);
      return res.status(500).json({ error: 'Failed to check existing connection' });
    }

    if (existingConnection && existingConnection.length > 0) {
      const existing = existingConnection[0];
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Users are already connected' });
      } else if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Connection request already pending' });
      } else if (existing.status === 'declined') {
        // Delete the declined connection to allow a new request
        const { error: deleteError } = await supabase
          .from('delegate_connections')
          .delete()
          .eq('id', existing.id);
        
        if (deleteError) {
          console.error('Error deleting declined connection:', deleteError);
          return res.status(500).json({ error: 'Failed to process previous connection' });
        }
      }
    }

    // Create connection request
    const { data: newConnection, error: createError } = await supabase
      .from('delegate_connections')
      .insert({
        requester_id: requester_id,
        recipient_id: recipient_id,
        status: 'pending',
        connection_message: connection_message
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating connection request:', createError);
      return res.status(500).json({ error: 'Failed to create connection request' });
    }

    // Get requester details for notification
    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('full_name, organization')
      .eq('id', requester_id)
      .single();

    if (requesterError) {
      console.error('Error getting requester details:', requesterError);
      // Continue anyway, notification will work without these details
    }

    // Create notification for recipient
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: recipient_id,
        type: 'new_connection_request',
        title: 'New Connection Request',
        body: `${requester?.full_name || 'Someone'} wants to connect with you${requester?.organization ? ` from ${requester.organization}` : ''}.`,
        link: '/meetings', // Will show connection requests in meetings page
        related_entity_id: newConnection.id
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Connection request sent successfully',
      connection: newConnection
    });

  } catch (error) {
    console.error('Send connection request error:', error);
    return res.status(500).json({
      error: 'Failed to send connection request',
      details: error.message
    });
  }
}
