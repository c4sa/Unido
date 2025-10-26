import nodemailer from 'nodemailer';
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
    const createTransporter = () => {
      const provider = process.env.EMAIL_PROVIDER || 'gmail';
      
      if (provider === 'gmail') {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          // Vercel-specific SSL configuration
          tls: {
            rejectUnauthorized: false
          }
        });
      } else if (provider === 'outlook') {
        return nodemailer.createTransport({
          service: 'hotmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false
          }
        });
      } else {
        // Custom SMTP configuration
        return nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false
          }
        });
      }
    };

    const transporter = createTransporter();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://unido-lu7i.vercel.app/main_logo.svg" alt="GC21 Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: #0064b0; margin: 0;">Reset Your Password</h1>
          <p style="color: #666; margin: 10px 0 0 0;">GC21 Security Code</p>
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
            This is an automated message from GC21. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const text = `
Reset Your Password - GC21

Your verification code: ${otpCode}

This code will expire in 60 minutes.

If you didn't request this password reset, please ignore this email.

This is an automated message. Please do not reply.
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your GC21 Password - Verification Code',
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
}
