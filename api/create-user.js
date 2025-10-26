import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, role } = req.body;

  // Validate required fields
  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate role
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
  }

  // Supabase configuration
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // SMTP Configuration
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
        },
        // Vercel-specific SSL configuration
        tls: {
          rejectUnauthorized: false
        }
      });
    } else if (smtpConfig.provider === 'outlook') {
      return nodemailer.createTransport({
        service: 'hotmail',
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass
        },
        tls: {
          rejectUnauthorized: false
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
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  };

  // Helper function to generate temporary password
  function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  console.log('Creating user:', email, 'with role:', role);

  try {
    // 1. Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === email);
    
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 2. Generate temporary password
    const tempPassword = generateTempPassword();

    // 3. Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        requires_password_reset: true,
        registration_method: 'admin_created'
      }
    });

    if (authError) throw authError;

    // 4. Create user profile in public.users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: '',
        role: role,
        is_password_reset: false, // New users need to reset password
        created_by: 'admin'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error('Failed to create user profile');
    }

    // 5. Send credentials email
    try {
      const transporter = createTransporter();
      
      const baseUrl = 'https://unido-lu7i.vercel.app';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${baseUrl}/main_logo.svg" alt="GC21 Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
            <h1 style="color: #0064b0; margin: 0;">Welcome to GC21</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Professional Networking Platform</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Your Account Has Been Created</h2>
            <p style="color: #666; margin-bottom: 0;">An administrator has created your account. You can now access the platform using the credentials below.</p>
          </div>
          
          <div style="background: #fff; border: 2px solid #0064b0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #0064b0; margin-top: 0;">Login Credentials</h3>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: #f1f3f4; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #856404; margin-top: 0;">Important Security Notice</h4>
            <p style="color: #856404; margin-bottom: 0;">You will be required to change your password on first login for security reasons.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}/login" style="background: #0064b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Login to Platform</a>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
            <p>If you have any questions, please contact your administrator.</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: smtpConfig.from,
        to: email,
        subject: 'Welcome to GC21 - Your Account Credentials',
        html: html,
        text: `Welcome to GC21!\n\nYour account has been created by an administrator.\n\nLogin Credentials:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nYou will be required to change your password on first login.\n\nLogin at: ${baseUrl}/login`
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the request for this
    }

    // 6. Return success
    return res.status(200).json({
      success: true,
      email,
      tempPassword,
      userId: authData.user.id,
      role: role
    });

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
