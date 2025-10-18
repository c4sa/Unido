import { createClient } from '@supabase/supabase-js';

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

  const { email, resetToken, newPassword } = req.body;

  // Validate required fields
  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ error: 'Email, reset token, and new password are required' });
  }

  // Validate password strength
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Parse and validate reset token
    const [tokenEmail, otp, timestamp] = resetToken.split(':');
    
    if (tokenEmail !== email) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Check if token is not too old (1 hour max)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 60 * 60 * 1000) { // 1 hour in milliseconds
      return res.status(400).json({ error: 'Reset token has expired. Please start the password reset process again.' });
    }

    // Get user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password using admin API (no authentication required)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ 
      error: 'Failed to update password',
      details: error.message 
    });
  }
}
