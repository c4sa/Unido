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

// Helper function to generate temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`);
  console.log(`📧 Email API available at http://localhost:${PORT}/api/send-email`);
  console.log(`🔐 Passcode verification API available at http://localhost:${PORT}/api/verify-passcode`);
  
  if (!smtpConfig.user || !smtpConfig.pass) {
    console.log('⚠️  SMTP not configured - emails will be simulated');
  } else {
    console.log(`✅ SMTP configured for ${smtpConfig.provider}`);
  }
});
