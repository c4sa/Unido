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

  const { email, otp, newPassword } = req.body;

  // Validate required fields
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate OTP format (6 digits)
  const otpRegex = /^[0-9]{6}$/;
  if (!otpRegex.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP format. Expected 6 digits' });
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
    // 1. Verify OTP
    const { data: isValid, error: verifyError } = await supabase
      .rpc('verify_and_use_otp', {
        p_email: email,
        p_otp_code: otp
      });

    if (verifyError) {
      console.error('OTP verification error:', verifyError);
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // 2. If newPassword is provided, update the password
    if (newPassword) {
      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Get user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === email);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update password
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
        message: 'Password updated successfully',
        action: 'password_updated'
      });
    }

    // 3. If no password provided, just verify OTP (for 2-step process)
    return res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully',
      action: 'otp_verified',
      resetToken: `${email}:${otp}:${Date.now()}` // Simple token for frontend
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ 
      error: 'Failed to verify OTP',
      details: error.message 
    });
  }
}
