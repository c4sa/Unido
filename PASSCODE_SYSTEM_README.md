# Passcode Registration System

## Overview

The passcode registration system allows new users to register using unique one-time passcodes (format: UN-xxxx) while maintaining all existing authentication functionality.

## Features

- **One-time passcodes**: 3000 unique codes in UN-xxxx format
- **Secure registration**: Passcodes can only be used once
- **Email notifications**: Automatic credential delivery via email
- **Password reset requirement**: New users must reset password on first login
- **Existing user compatibility**: No impact on current authentication flows

## Database Schema

### New Tables

#### `passcodes`
```sql
CREATE TABLE public.passcodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^UN-[0-9]{4}$'),
  is_used BOOLEAN DEFAULT FALSE NOT NULL,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Updated `users` table
```sql
ALTER TABLE public.users 
ADD COLUMN is_password_reset BOOLEAN DEFAULT TRUE NOT NULL;
```

### Functions

- `generate_passcodes(count INTEGER)` - Generates unique passcodes
- `verify_and_use_passcode(p_code TEXT, p_email TEXT, p_user_id UUID)` - Verifies and marks passcode as used

## API Endpoints

### `/api/verify-passcode`
- **Method**: POST
- **Body**: `{ email: string, code: string }`
- **Response**: `{ success: boolean, email: string, tempPassword: string, userId: string }`

### `/api/send-email`
- **Method**: POST
- **Body**: `{ to: string, subject: string, html: string, text: string }`
- **Response**: `{ success: boolean }`

## User Flow

### New User Registration
1. User visits login page
2. Clicks "Check" button (for new users)
3. Redirected to `/verify-code`
4. Enters email and 6-digit code (UNxxxx format)
5. Code is verified and user account created
6. Temporary password generated
7. Credentials sent via email
8. User redirected to login page

### First Login
1. User logs in with temporary credentials
2. Password reset modal appears (blocks navigation)
3. User sets new password
4. Confirmation email sent
5. User redirected to dashboard

### Existing Users
- No changes to current login flow
- `is_password_reset` set to `false` for existing users
- Normal authentication continues as before

## Setup Instructions

### 1. Database Migration
```bash
# Run the migration script in Supabase SQL editor
psql -f passcode-migration.sql
```

### 2. Generate Passcodes
```bash
# Install dependencies
npm install

# Set up environment variables
cp env.template .env
# Edit .env with your credentials

# Generate passcodes
node scripts/generate-passcodes.js
```

### 3. Environment Variables

#### Required for Vercel Functions
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="UNIConnect <noreply@uniconnect.com>"
```

### 4. Vercel Deployment
1. Deploy to Vercel
2. Add environment variables in Vercel dashboard
3. Update Supabase auth redirect URLs to include Vercel domain

## File Structure

```
src/
├── components/
│   └── auth/
│       └── PasswordResetModal.jsx    # Password reset modal
├── pages/
│   ├── Login.jsx                     # Updated with password reset check
│   ├── VerifyCode.jsx               # New user verification
│   ├── ForgotPassword.jsx           # Password reset flow
│   ├── VerifyOTP.jsx               # OTP verification
│   └── ResetPassword.jsx           # Password reset form
├── utils/
│   └── emailService.js              # Email utilities
└── api/
    └── entities.js                  # Updated with PasscodeEntity

api/
├── send-email.js                    # Email sending function
└── verify-passcode.js              # Passcode verification function

scripts/
└── generate-passcodes.js           # Passcode generation script
```

## Security Features

- **One-time use**: Passcodes can only be used once
- **Format validation**: Strict UN-xxxx format enforcement
- **Email verification**: Credentials sent to verified email
- **Password strength**: Enforced password requirements
- **Secure storage**: Passwords encrypted by Supabase Auth
- **Session management**: Proper authentication state handling

## Testing

### Test Scenarios
1. **New user registration** with valid passcode
2. **Invalid passcode** rejection
3. **Used passcode** rejection
4. **Email delivery** verification
5. **Password reset** modal functionality
6. **Existing user** login (unchanged)
7. **Password strength** validation

### Manual Testing
```bash
# Start development server
npm run dev

# Test flows:
# 1. Visit /login
# 2. Click "Check" for new user
# 3. Enter email and valid passcode
# 4. Check email for credentials
# 5. Login with temporary password
# 6. Complete password reset
```

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check Vercel environment variables
   - Verify SMTP credentials
   - Check email service logs

2. **Passcode verification fails**
   - Ensure passcodes are generated
   - Check database connection
   - Verify API endpoint deployment

3. **Password reset modal not showing**
   - Check `is_password_reset` field in database
   - Verify user profile creation
   - Check console for errors

### Debug Commands
```bash
# Check passcode count
SELECT COUNT(*) FROM passcodes;

# Check unused passcodes
SELECT COUNT(*) FROM passcodes WHERE is_used = false;

# Check user password reset status
SELECT email, is_password_reset FROM users WHERE is_password_reset = true;
```

## Maintenance

### Regular Tasks
- Monitor passcode usage
- Generate new passcodes when needed
- Check email delivery rates
- Review security logs

### Monitoring
- Track passcode usage in database
- Monitor email delivery success rates
- Check for failed verification attempts
- Review user registration patterns

## Support

For issues or questions:
1. Check this documentation
2. Review console logs
3. Check Supabase logs
4. Verify environment variables
5. Test with sample passcodes
