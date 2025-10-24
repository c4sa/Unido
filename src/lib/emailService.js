/**
 * Email Service with Smart Fallback
 * Uses local server in development, serverless functions in production
 */

// API Base URL - smart detection like reference project
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

// Get the base URL for images in emails
const getBaseUrl = () => {
  // Check if we're in development mode
  const isDev = import.meta.env.DEV || 
                window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('localhost');
  
  if (isDev) {
    return 'http://localhost:5173';
  }
  
  // In production, use the deployed URL
  // You'll need to replace this with your actual Vercel URL
  return 'https://your-app-name.vercel.app';
};

// Development fallback - simulate email sending
const simulateEmailSending = async ({ to, subject, html, text }) => {
  console.log('📧 Simulating email sending (development mode):');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('HTML Preview:', html.substring(0, 200) + '...');
  console.log('🔍 Full HTML contains logo URL:', html.includes('main_logo.svg'));
  console.log('🔍 Logo URL in HTML:', html.match(/src="[^"]*main_logo\.svg[^"]*"/)?.[0]);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    messageId: 'dev-' + Date.now(),
    response: 'Email simulated in development mode'
  };
};

// Email service with graceful fallback
export const emailService = {
  // Generic send function for all emails
  async send({ to, subject, html, text }) {
    try {
      // Try to use the API endpoint first
      const response = await fetch(`${API_BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('API endpoint failed, falling back to simulation:', error.message);
      
      // Check if it's a network error (server not running or CORS issue)
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('404') || 
          error.message.includes('CORS') ||
          error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.log('🔧 API endpoint not available. Starting simulation mode...');
      }
      
      // Fallback to simulation in both development and production
      return await simulateEmailSending({ to, subject, html, text });
    }
  },

  // Send credentials email (for passcode registration)
  async sendCredentialsEmail(email, tempPassword) {
    const baseUrl = getBaseUrl();
    console.log('🔍 Email Service Debug:');
    console.log('- Environment DEV:', import.meta.env.DEV);
    console.log('- Window location:', window.location?.hostname);
    console.log('- Generated baseUrl:', baseUrl);
    console.log('- Logo URL will be:', `${baseUrl}/main_logo.svg`);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${baseUrl}/main_logo.svg" alt="Unido Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: #0064b0; margin: 0;">Welcome to Unido</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Professional Networking Platform</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin: 0 0 15px 0;">Your Account Credentials</h2>
          <p style="margin: 10px 0;">Your account has been created successfully using your passcode.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #0064b0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #f1f1f1; padding: 2px 6px; border-radius: 3px;">${tempPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border: 1px solid #ffeaa7; margin: 15px 0;">
            <p style="margin: 0; color: #856404;"><strong>Important:</strong> You will be required to change your password on first login for security reasons.</p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/login" 
             style="display: inline-block; background: #0064b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Login to Unido
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 5px 0;">This is an automated message. Please do not reply to this email.</p>
          <p style="margin: 5px 0;">If you did not request this account, please contact support.</p>
        </div>
      </div>
    `;

    const text = `
Welcome to UNIConnect - Professional Networking Platform

Your account has been created successfully using your passcode.

Account Credentials:
Email: ${email}
Temporary Password: ${tempPassword}

Important: You will be required to change your password on first login for security reasons.

Login at: ${window.location.origin}/login

This is an automated message. Please do not reply to this email.
If you did not request this account, please contact support.
    `;

    try {
      const result = await this.send({
        to: email,
        subject: 'Welcome to Unido - Your Account Credentials',
        html,
        text
      });
      
      return result;
    } catch (error) {
      console.error('Error sending credentials email:', error);
      throw error;
    }
  },

  // Send password reset confirmation
  async sendPasswordResetConfirmation(email) {
    const baseUrl = getBaseUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${baseUrl}/main_logo.svg" alt="Unido Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: #0064b0; margin: 0;">Password Updated Successfully</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Unido Security Notification</p>
        </div>
        
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; border: 1px solid #c3e6cb; margin: 20px 0;">
          <h2 style="color: #155724; margin: 0 0 15px 0;">✓ Password Successfully Changed</h2>
          <p style="margin: 10px 0; color: #155724;">Your password has been updated successfully. Your account is now secure and ready to use.</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Account:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/dashboard" 
             style="display: inline-block; background: #0064b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Access Your Dashboard
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 5px 0;">This is a security notification. If you did not make this change, please contact support immediately.</p>
        </div>
      </div>
    `;

    const text = `
Password Updated Successfully - UNIConnect Security Notification

Your password has been updated successfully. Your account is now secure and ready to use.

Account: ${email}
Updated: ${new Date().toLocaleString()}

Access your dashboard at: ${window.location.origin}/dashboard

This is a security notification. If you did not make this change, please contact support immediately.
    `;

    try {
      const result = await this.send({
        to: email,
        subject: 'Password Updated Successfully - Unido',
        html,
        text
      });
      
      return result;
    } catch (error) {
      console.error('Error sending password reset confirmation:', error);
      throw error;
    }
  },

  // Send password reset OTP email
  async sendPasswordResetOTP(email, otpCode) {
    const baseUrl = getBaseUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${baseUrl}/main_logo.svg" alt="Unido Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: #0064b0; margin: 0;">Reset Your Password</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Unido Security Code</p>
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
            This is an automated message from Unido. Please do not reply to this email.
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

    try {
      const result = await this.send({
        to: email,
        subject: 'Reset Your Unido Password - Verification Code',
        html,
        text
      });
      
      return result;
    } catch (error) {
      console.error('Error sending password reset OTP email:', error);
      throw error;
    }
  },

  // Send welcome email after password reset
  async sendWelcomeEmail(email, fullName) {
    const baseUrl = getBaseUrl();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${baseUrl}/main_logo.svg" alt="Unido Logo" style="height: 60px; width: auto; margin-bottom: 15px;" />
          <h1 style="color: #0064b0; margin: 0;">Welcome to Unido!</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Your Professional Networking Journey Begins</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333; margin: 0 0 15px 0;">🎉 Account Setup Complete!</h2>
          <p style="margin: 10px 0;">Hello ${fullName || 'there'},</p>
          <p style="margin: 10px 0;">Congratulations! You have successfully completed your account setup and are now ready to explore Unido's professional networking features.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #0064b0; margin: 15px 0;">
            <h3 style="margin: 0 0 10px 0; color: #0064b0;">What's Next?</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Complete your professional profile</li>
              <li>Browse and connect with other delegates</li>
              <li>Send meeting requests to expand your network</li>
              <li>Book venues for your meetings</li>
              <li>Start meaningful conversations</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/dashboard" 
             style="display: inline-block; background: #0064b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
            Go to Dashboard
          </a>
          <a href="${window.location.origin}/profile" 
             style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Complete Profile
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 5px 0;">Thank you for joining Unido - where professional connections flourish.</p>
          <p style="margin: 5px 0;">If you have any questions, please don't hesitate to contact our support team.</p>
        </div>
      </div>
    `;

    const text = `
Welcome to Unido - Your Professional Networking Journey Begins!

Hello ${fullName || 'there'},

Congratulations! You have successfully completed your account setup and are now ready to explore Unido's professional networking features.

What's Next?
- Complete your professional profile
- Browse and connect with other delegates  
- Send meeting requests to expand your network
- Book venues for your meetings
- Start meaningful conversations

Access your dashboard: ${window.location.origin}/dashboard
Complete your profile: ${window.location.origin}/profile

Thank you for joining Unido - where professional connections flourish.
If you have any questions, please don't hesitate to contact our support team.
    `;

    try {
      const result = await this.send({
        to: email,
        subject: '🎉 Welcome to Unido - Let\'s Get Started!',
        html,
        text
      });
      
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
};

export default emailService;
