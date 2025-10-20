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

    // Prevent checking permission with self
    if (user1_id === user2_id) {
      return res.status(400).json({ error: 'Cannot check permission with yourself' });
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

    // Get connection details for additional context
    let connectionDetails = null;
    if (canMessage) {
      const { data: connection, error: detailsError } = await supabase
        .from('delegate_connections')
        .select('id, status, created_date')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(requester_id.eq.${user2_id},recipient_id.eq.${user1_id})`)
        .single();

      if (!detailsError && connection) {
        connectionDetails = connection;
      }
    }

    return res.status(200).json({
      success: true,
      can_direct_message: canMessage,
      connection_details: connectionDetails,
      message: canMessage 
        ? 'Users are connected and can send direct messages'
        : 'Users are not connected. A connection request must be accepted first.'
    });

  } catch (error) {
    console.error('Check direct message permission error:', error);
    return res.status(500).json({ 
      error: 'Failed to check direct message permission', 
      details: error.message 
    });
  }
}
