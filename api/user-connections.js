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
    const { user_id } = req.query;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get all connections for the user (both sent and received)
    const { data: connections, error: connectionsError } = await supabase
      .from('delegate_connections')
      .select(`
        id,
        requester_id,
        recipient_id,
        status,
        connection_message,
        created_date,
        updated_date
      `)
      .or(`requester_id.eq.${user_id},recipient_id.eq.${user_id}`)
      .order('created_date', { ascending: false });

    if (connectionsError) {
      console.error('Error getting connections:', connectionsError);
      return res.status(500).json({ error: 'Failed to get connections' });
    }

    // Get all unique user IDs to fetch user details
    const userIds = new Set();
    connections.forEach(conn => {
      userIds.add(conn.requester_id);
      userIds.add(conn.recipient_id);
    });
    userIds.delete(user_id); // Remove current user

    // Fetch user details for all connected users
    let users = [];
    if (userIds.size > 0) {
      const { data: userData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, organization, job_title, country')
        .in('id', Array.from(userIds));

      if (usersError) {
        console.error('Error getting user details:', usersError);
        return res.status(500).json({ error: 'Failed to get user details' });
      }

      users = userData || [];
    }

    // Create user lookup map
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Format connections with user details
    const formattedConnections = connections.map(conn => {
      const isRequester = conn.requester_id === user_id;
      const otherUserId = isRequester ? conn.recipient_id : conn.requester_id;
      const otherUser = userMap[otherUserId];

      return {
        id: conn.id,
        status: conn.status,
        connection_message: conn.connection_message,
        created_date: conn.created_date,
        updated_date: conn.updated_date,
        is_requester: isRequester,
        other_user: otherUser ? {
          id: otherUser.id,
          full_name: otherUser.full_name,
          organization: otherUser.organization,
          job_title: otherUser.job_title,
          country: otherUser.country
        } : null
      };
    });

    // Separate connections by status for easier frontend handling
    const result = {
      pending_sent: formattedConnections.filter(c => c.status === 'pending' && c.is_requester),
      pending_received: formattedConnections.filter(c => c.status === 'pending' && !c.is_requester),
      accepted: formattedConnections.filter(c => c.status === 'accepted'),
      declined: formattedConnections.filter(c => c.status === 'declined'),
      all: formattedConnections
    };

    return res.status(200).json({
      success: true,
      connections: result
    });

  } catch (error) {
    console.error('Get user connections error:', error);
    return res.status(500).json({
      error: 'Failed to get user connections',
      details: error.message
    });
  }
}
