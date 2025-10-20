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

    // Validate password strength (same as frontend validation)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/(?=.*[a-z])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
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

// =====================================================
// CONNECTION REQUEST ENDPOINTS
// =====================================================

// Send connection request endpoint
app.post('/api/send-connection-request', async (req, res) => {
  try {
    const { requester_id, recipient_id, connection_message = '' } = req.body;

    // Validate required fields
    if (!requester_id || !recipient_id) {
      return res.status(400).json({ error: 'Requester ID and recipient ID are required' });
    }

    // Prevent self-connection
    if (requester_id === recipient_id) {
      return res.status(400).json({ error: 'Cannot send connection request to yourself' });
    }

    // Use the database function to handle connection creation with proper duplicate handling
    const { data: result, error: createError } = await supabase
      .rpc('create_connection_request', {
        p_requester_id: requester_id,
        p_recipient_id: recipient_id,
        p_message: connection_message || ''
      });

    if (createError) {
      console.error('Error creating connection request:', createError);
      return res.status(500).json({ error: 'Failed to create connection request' });
    }

    const connectionResult = result[0];
    if (connectionResult.status === 'error') {
      return res.status(400).json({ error: connectionResult.message });
    }

    // Get the created connection details
    const { data: newConnection, error: getError } = await supabase
      .from('delegate_connections')
      .select('*')
      .eq('id', connectionResult.connection_id)
      .single();

    if (getError) {
      console.error('Error getting created connection:', getError);
      return res.status(500).json({ error: 'Failed to get connection details' });
    }

    // Get requester details for notification
    const { data: requester, error: requesterError } = await supabase
      .from('users')
      .select('full_name, organization')
      .eq('id', requester_id)
      .single();

    if (!requesterError && requester) {
      // Create notification for recipient
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipient_id,
          type: 'new_connection_request',
          title: 'New Connection Request',
          body: `${requester.full_name} wants to connect with you${requester.organization ? ` from ${requester.organization}` : ''}.`,
          link: '/meetings',
          related_entity_id: newConnection.id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Connection request sent successfully',
      connection: newConnection
    });

  } catch (error) {
    console.error('Send connection request error:', error);
    return res.status(500).json({
      error: 'Failed to send connection request',
      details: error.message
    });
  }
});

// Respond to connection request endpoint
app.post('/api/respond-connection-request', async (req, res) => {
  try {
    const { connection_id, response } = req.body;

    // Validate required fields
    if (!connection_id || !response) {
      return res.status(400).json({ error: 'Connection ID and response are required' });
    }

    // Validate response value
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'Response must be "accepted" or "declined"' });
    }

    // Get the connection request
    const { data: connection, error: getError } = await supabase
      .from('delegate_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (getError) {
      console.error('Error getting connection:', getError);
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Check if connection is still pending
    if (connection.status !== 'pending') {
      return res.status(400).json({ error: 'Connection request is no longer pending' });
    }

    // Update connection status
    const { data: updatedConnection, error: updateError } = await supabase
      .from('delegate_connections')
      .update({ status: response })
      .eq('id', connection_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating connection:', updateError);
      return res.status(500).json({ error: 'Failed to update connection request' });
    }

    // Get recipient details for notification
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('full_name, organization')
      .eq('id', connection.recipient_id)
      .single();

    if (!recipientError && recipient) {
      // Create notification for requester
      const notificationType = response === 'accepted' ? 'connection_accepted' : 'connection_declined';
      const notificationTitle = response === 'accepted' ? 'Connection Accepted' : 'Connection Declined';
      const notificationBody = response === 'accepted' 
        ? `${recipient.full_name} accepted your connection request. You can now send meeting requests to each other.`
        : `${recipient.full_name} declined your connection request.`;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: connection.requester_id,
          type: notificationType,
          title: notificationTitle,
          body: notificationBody,
          link: '/meetings',
          related_entity_id: connection_id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Connection request ${response} successfully`,
      connection: updatedConnection
    });

  } catch (error) {
    console.error('Respond to connection request error:', error);
    return res.status(500).json({
      error: 'Failed to respond to connection request',
      details: error.message
    });
  }
});

// Get user connections endpoint
app.get('/api/user-connections', async (req, res) => {
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
});

// Check connection status endpoint
app.get('/api/check-connection', async (req, res) => {
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
});

// Validate group meeting connections endpoint
app.post('/api/validate-group-connections', async (req, res) => {
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
});

// ===================================================== 
// DIRECT MESSAGING ENDPOINTS
// ===================================================== 

// Send direct message endpoint
app.post('/api/send-direct-message', async (req, res) => {
  try {
    const { sender_id, recipient_id, message } = req.body;

    // Validate required fields
    if (!sender_id || !recipient_id || !message) {
      return res.status(400).json({ error: 'Sender ID, recipient ID, and message are required' });
    }

    // Validate message length
    if (message.length < 1 || message.length > 5000) {
      return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    }

    // Prevent self-messaging
    if (sender_id === recipient_id) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Check if users are connected using the database function
    const { data: canMessage, error: connectionError } = await supabase
      .rpc('can_users_direct_message', {
        user1_id: sender_id,
        user2_id: recipient_id
      });

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return res.status(500).json({ error: 'Failed to verify connection status' });
    }

    if (!canMessage) {
      return res.status(403).json({ error: 'You must be connected to this delegate to send direct messages' });
    }

    // Create the direct message
    const { data: newMessage, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: sender_id,
        recipient_id: recipient_id,
        message: message,
        message_type: 'text',
        message_context: 'direct',
        meeting_request_id: null // Explicitly set to null for direct messages
      })
      .select(`
        *,
        sender:users!sender_id (
          id,
          full_name
        ),
        recipient:users!recipient_id (
          id,
          full_name
        )
      `)
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Get recipient details for notification
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('full_name, notification_preferences')
      .eq('id', recipient_id)
      .single();

    if (!recipientError && recipient) {
      // Create notification for recipient (non-blocking)
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipient_id,
          type: 'new_message',
          title: 'New Direct Message',
          body: `You have a new direct message from ${newMessage.sender.full_name}.`,
          link: `/chat?type=direct&delegate=${sender_id}`,
          related_entity_id: newMessage.id
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the message sending for notification errors
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Direct message sent successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Send direct message error:', error);
    return res.status(500).json({ 
      error: 'Failed to send direct message', 
      details: error.message 
    });
  }
});

// Get direct messages endpoint
app.get('/api/get-direct-messages', async (req, res) => {
  try {
    const { user1_id, user2_id } = req.query;

    // Validate required fields
    if (!user1_id || !user2_id) {
      return res.status(400).json({ error: 'Both user IDs are required' });
    }

    // Prevent querying messages with self
    if (user1_id === user2_id) {
      return res.status(400).json({ error: 'Cannot get messages with yourself' });
    }

    // Check if users are connected using the database function
    const { data: canMessage, error: connectionError } = await supabase
      .rpc('can_users_direct_message', {
        user1_id: user1_id,
        user2_id: user2_id
      });

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return res.status(500).json({ error: 'Failed to verify connection status' });
    }

    if (!canMessage) {
      return res.status(403).json({ error: 'You must be connected to this delegate to view direct messages' });
    }

    // Get direct messages between the two users (bidirectional)
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          full_name
        ),
        recipient:users!recipient_id (
          id,
          full_name
        )
      `)
      .eq('message_context', 'direct')
      .or(`and(sender_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(sender_id.eq.${user2_id},recipient_id.eq.${user1_id})`)
      .order('created_date', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark messages as read for the requesting user (user1_id)
    const unreadMessages = (messages || []).filter(
      msg => msg.recipient_id === user1_id && !msg.read_status
    );

    if (unreadMessages.length > 0) {
      const unreadMessageIds = unreadMessages.map(msg => msg.id);
      
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ read_status: true })
        .in('id', unreadMessageIds);

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
        // Don't fail the request for read status update errors
      }
    }

    return res.status(200).json({
      success: true,
      messages: messages || [],
      total_count: (messages || []).length,
      unread_count: unreadMessages.length
    });

  } catch (error) {
    console.error('Get direct messages error:', error);
    return res.status(500).json({ 
      error: 'Failed to get direct messages', 
      details: error.message 
    });
  }
});

// Check direct message permission endpoint
app.get('/api/check-direct-message-permission', async (req, res) => {
  try {
    const { user1_id, user2_id } = req.query;

    // Validate required fields
    if (!user1_id || !user2_id) {
      return res.status(400).json({ error: 'Both user IDs are required' });
    }

    // Prevent checking permission with self
    if (user1_id === user2_id) {
      return res.status(400).json({ error: 'Cannot check permission with yourself' });
    }

    // Check if users are connected using the database function
    const { data: canMessage, error: connectionError } = await supabase
      .rpc('can_users_direct_message', {
        user1_id: user1_id,
        user2_id: user2_id
      });

    if (connectionError) {
      console.error('Error checking connection:', connectionError);
      return res.status(500).json({ error: 'Failed to verify connection status' });
    }

    // Get connection details for additional context
    let connectionDetails = null;
    if (canMessage) {
      const { data: connection, error: detailsError } = await supabase
        .from('delegate_connections')
        .select('id, status, created_date')
        .eq('status', 'accepted')
        .or(`and(requester_id.eq.${user1_id},recipient_id.eq.${user2_id}),and(requester_id.eq.${user2_id},recipient_id.eq.${user1_id})`)
        .single();

      if (!detailsError && connection) {
        connectionDetails = connection;
      }
    }

    return res.status(200).json({
      success: true,
      can_direct_message: canMessage,
      connection_details: connectionDetails,
      message: canMessage 
        ? 'Users are connected and can send direct messages'
        : 'Users are not connected. A connection request must be accepted first.'
    });

  } catch (error) {
    console.error('Check direct message permission error:', error);
    return res.status(500).json({ 
      error: 'Failed to check direct message permission', 
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
  console.log(`🤝 Connection request API available at http://localhost:${PORT}/api/send-connection-request`);
  console.log(`📋 Connection response API available at http://localhost:${PORT}/api/respond-connection-request`);
  console.log(`👥 User connections API available at http://localhost:${PORT}/api/user-connections`);
  console.log(`🔍 Check connection API available at http://localhost:${PORT}/api/check-connection`);
  console.log(`✔️  Group validation API available at http://localhost:${PORT}/api/validate-group-connections`);
  console.log(`💬 Send direct message API available at http://localhost:${PORT}/api/send-direct-message`);
  console.log(`📨 Get direct messages API available at http://localhost:${PORT}/api/get-direct-messages`);
  console.log(`🔐 Check direct message permission API available at http://localhost:${PORT}/api/check-direct-message-permission`);
  
  if (!smtpConfig.user || !smtpConfig.pass) {
    console.log('⚠️  SMTP not configured - emails will be simulated');
  } else {
    console.log(`✅ SMTP configured for ${smtpConfig.provider}`);
  }
});
