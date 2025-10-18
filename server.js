import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// SMTP Configuration from environment variables
const smtpConfig = {
  provider: process.env.EMAIL_PROVIDER || 'gmail',
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === '465',
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER
};

// Create transporter based on provider
const createTransporter = () => {
  if (smtpConfig.provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });
  } else if (smtpConfig.provider === 'outlook') {
    return nodemailer.createTransport({
      service: 'hotmail',
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });
  } else {
    // Custom SMTP configuration
    return nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });
  }
};

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    // Check if SMTP is configured
    if (!smtpConfig.user || !smtpConfig.pass) {
      console.log('📧 SMTP not configured, simulating email sending');
      return res.status(200).json({ 
        success: true, 
        messageId: 'sim-' + Date.now(),
        response: 'Email simulated (SMTP not configured)'
      });
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: smtpConfig.from,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    };

    const result = await transporter.sendMail(mailOptions);
    
    return res.status(200).json({ 
      success: true, 
      messageId: result.messageId,
      response: result.response 
    });

  } catch (error) {
    console.error('Failed to send email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Passcode verification endpoint (from your existing API)
app.post('/api/verify-passcode', async (req, res) => {
  const { email, code } = req.body;

  // Validate required fields
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate code format (UN-xxxx)
  const codeRegex = /^UN-[0-9]{4}$/;
  if (!codeRegex.test(code)) {
    return res.status(400).json({ error: 'Invalid code format. Expected: UN-xxxx' });
  }

  console.log('Verifying passcode:', code, 'for email:', email);

  try {
    // 1. Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === email);
    
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 2. Verify passcode exists and is not used
    const { data: passcode, error: passcodeError } = await supabase
      .from('passcodes')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .single();

    if (passcodeError || !passcode) {
      return res.status(400).json({ error: 'Invalid or already used passcode' });
    }

    // 3. Generate temporary password
    const tempPassword = generateTempPassword();

    // 4. Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        requires_password_reset: true,
        registration_method: 'passcode'
      }
    });

    if (authError) throw authError;

    // 5. Create user profile in public.users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: '',
        role: 'user',
        is_password_reset: true,
        created_by: email
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create user profile');
    }

    // 6. Mark passcode as used
    const { error: updateError } = await supabase
      .from('passcodes')
      .update({
        is_used: true,
        used_by: authData.user.id,
        used_at: new Date().toISOString()
      })
      .eq('code', code);

    if (updateError) {
      console.error('Passcode update error:', updateError);
    }

    // 7. Return credentials for email
    return res.status(200).json({
      success: true,
      email,
      tempPassword,
      userId: authData.user.id
    });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Send Password Reset OTP endpoint
app.post('/api/send-password-reset-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 1. Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers.users.some(user => user.email === email);
    
    if (!userExists) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    // 2. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store OTP in database (expires in 60 minutes)
    const { data: otpData, error: storeError } = await supabase
      .rpc('store_password_reset_otp', {
        p_email: email,
        p_otp_code: otpCode,
        p_expires_minutes: 60
      });

    if (storeError) {
      console.error('Error storing OTP:', storeError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // 4. Send OTP email
    const transporter = createTransporter();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0064b0; margin: 0;">Reset Your Password</h1>
          <p style="color: #666; margin: 10px 0 0 0;">UNIConnect Security Code</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin: 0 0 20px 0; text-align: center;">Your Verification Code</h2>
          <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; background: #0064b0; color: white; padding: 15px 30px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
              ${otpCode}
            </div>
          </div>
          <p style="color: #666; text-align: center; margin: 20px 0 0 0;">
            This code will expire in <strong>60 minutes</strong>
          </p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. 
            Your account remains secure.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This is an automated message from UNIConnect. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const text = `
Reset Your Password - UNIConnect

Your verification code: ${otpCode}

This code will expire in 60 minutes.

If you didn't request this password reset, please ignore this email.

This is an automated message. Please do not reply.
    `;

    await transporter.sendMail({
      from: smtpConfig.from,
      to: email,
      subject: 'Reset Your UNIConnect Password - Verification Code',
      html,
      text
    });

    return res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      expiresIn: 60 // minutes
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ 
      error: 'Failed to send OTP',
      details: error.message 
    });
  }
});

// Verify Password Reset OTP endpoint
app.post('/api/verify-password-reset-otp', async (req, res) => {
  try {
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
});

// Helper function to generate temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Update password after OTP verification (no OTP re-verification needed)
app.post('/api/update-password-after-otp', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    // Validate required fields
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

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
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`);
  console.log(`📧 Email API available at http://localhost:${PORT}/api/send-email`);
  console.log(`🔐 Passcode verification API available at http://localhost:${PORT}/api/verify-passcode`);
  console.log(`🔑 Password reset OTP API available at http://localhost:${PORT}/api/send-password-reset-otp`);
  console.log(`✅ OTP verification API available at http://localhost:${PORT}/api/verify-password-reset-otp`);
  console.log(`🔒 Password update API available at http://localhost:${PORT}/api/update-password-after-otp`);
  
  if (!smtpConfig.user || !smtpConfig.pass) {
    console.log('⚠️  SMTP not configured - emails will be simulated');
  } else {
    console.log(`✅ SMTP configured for ${smtpConfig.provider}`);
  }
});
