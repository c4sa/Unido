/**
 * Email Service Utility
 * Uses smart email service with fallback approach
 */

import { emailService } from '@/lib/emailService';

export async function sendCredentialsEmail(email, tempPassword) {
  try {
    return await emailService.sendCredentialsEmail(email, tempPassword);
  } catch (error) {
    console.error('Error sending credentials email:', error);
    throw error;
  }
}

export async function sendPasswordResetConfirmation(email) {
  try {
    return await emailService.sendPasswordResetConfirmation(email);
  } catch (error) {
    console.error('Error sending password reset confirmation:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(email, fullName) {
  try {
    return await emailService.sendWelcomeEmail(email, fullName);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}
