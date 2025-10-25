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
    const { user1, user2 } = req.query;

    // Validate required fields
    if (!user1 || !user2) {
      return res.status(400).json({ error: 'Both user IDs are required' });
    }

    // Prevent checking connection with self
    if (user1 === user2) {
      return res.status(400).json({ error: 'Cannot check connection with yourself' });
    }

    // Check if users are connected (bidirectional check)
    const { data: connection, error: checkError } = await supabase
      .from('delegate_connections')
      .select('id, status')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${user1},recipient_id.eq.${user2}),and(requester_id.eq.${user2},recipient_id.eq.${user1})`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking connection:', checkError);
      return res.status(500).json({ error: 'Failed to check connection status' });
    }

    const connected = !!connection;

    return res.status(200).json({
      success: true,
      connected: connected,
      connection_id: connection?.id || null
    });

  } catch (error) {
    console.error('Check connection error:', error);
    return res.status(500).json({
      error: 'Failed to check connection status',
      details: error.message
    });
  }
}
