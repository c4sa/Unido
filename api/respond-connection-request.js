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
    const { connection_id, response } = req.body;

    // Validate required fields
    if (!connection_id || !response) {
      return res.status(400).json({ error: 'Connection ID and response are required' });
    }

    // Validate response value
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'Response must be "accepted" or "declined"' });
    }

    // Get the connection request
    const { data: connection, error: getError } = await supabase
      .from('delegate_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (getError) {
      console.error('Error getting connection:', getError);
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Check if connection is still pending
    if (connection.status !== 'pending') {
      return res.status(400).json({ error: 'Connection request is no longer pending' });
    }

    // Update connection status
    const { data: updatedConnection, error: updateError } = await supabase
      .from('delegate_connections')
      .update({ status: response })
      .eq('id', connection_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating connection:', updateError);
      return res.status(500).json({ error: 'Failed to update connection request' });
    }

    // Get recipient details for notification
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('full_name, organization')
      .eq('id', connection.recipient_id)
      .single();

    if (recipientError) {
      console.error('Error getting recipient details:', recipientError);
      // Continue anyway
    }

    // Create notification for requester
    const notificationType = response === 'accepted' ? 'connection_accepted' : 'connection_declined';
    const notificationTitle = response === 'accepted' ? 'Connection Accepted' : 'Connection Declined';
    const notificationBody = response === 'accepted' 
      ? `${recipient?.full_name || 'Someone'} accepted your connection request. You can now send meeting requests to each other.`
      : `${recipient?.full_name || 'Someone'} declined your connection request.`;

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: connection.requester_id,
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        link: '/meetings',
        related_entity_id: connection_id
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({
      success: true,
      message: `Connection request ${response} successfully`,
      connection: updatedConnection
    });

  } catch (error) {
    console.error('Respond to connection request error:', error);
    return res.status(500).json({
      error: 'Failed to respond to connection request',
      details: error.message
    });
  }
}
