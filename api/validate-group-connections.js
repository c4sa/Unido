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
    const { requester_id, recipient_ids } = req.body;

    // Validate required fields
    if (!requester_id || !recipient_ids || !Array.isArray(recipient_ids)) {
      return res.status(400).json({ error: 'Requester ID and recipient IDs array are required' });
    }

    if (recipient_ids.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    // Remove requester from recipients if accidentally included
    const cleanRecipientIds = recipient_ids.filter(id => id !== requester_id);

    if (cleanRecipientIds.length === 0) {
      return res.status(400).json({ error: 'Cannot send meeting request to yourself' });
    }

    // Check connections for each recipient
    const connectionChecks = [];
    
    for (const recipientId of cleanRecipientIds) {
      // Check if requester is connected to this recipient
      const { data: connection, error: checkError } = await supabase
        .from('delegate_connections')
        .select('id, status')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${requester_id},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requester_id})`)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking connection with ${recipientId}:`, checkError);
        connectionChecks.push({
          user_id: recipientId,
          connected: false,
          error: 'Failed to check connection'
        });
      } else {
        connectionChecks.push({
          user_id: recipientId,
          connected: !!connection,
          connection_id: connection?.id || null
        });
      }
    }

    // Get user details for unconnected users
    const unconnectedUserIds = connectionChecks
      .filter(check => !check.connected)
      .map(check => check.user_id);

    let unconnectedUsers = [];
    if (unconnectedUserIds.length > 0) {
      const { data: userData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, organization')
        .in('id', unconnectedUserIds);

      if (usersError) {
        console.error('Error getting user details:', usersError);
      } else {
        unconnectedUsers = userData || [];
      }
    }

    // Add user details to connection checks
    const detailedChecks = connectionChecks.map(check => {
      if (!check.connected) {
        const userDetails = unconnectedUsers.find(user => user.id === check.user_id);
        return {
          ...check,
          user_details: userDetails || null
        };
      }
      return check;
    });

    const allConnected = connectionChecks.every(check => check.connected);
    const connectedCount = connectionChecks.filter(check => check.connected).length;

    return res.status(200).json({
      success: true,
      all_connected: allConnected,
      total_recipients: cleanRecipientIds.length,
      connected_count: connectedCount,
      unconnected_count: cleanRecipientIds.length - connectedCount,
      connection_checks: detailedChecks,
      can_send_group_meeting: allConnected
    });

  } catch (error) {
    console.error('Validate group connections error:', error);
    return res.status(500).json({
      error: 'Failed to validate group connections',
      details: error.message
    });
  }
}
