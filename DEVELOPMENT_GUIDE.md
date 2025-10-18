# Development Guide - Passcode Registration System

## You're absolutely right! 

The email service should be embedded as Vercel serverless functions that work seamlessly in both development and production. No separate services needed.

## How It Works

### **Development Mode**
- Vercel CLI runs serverless functions locally
- Frontend calls `/api/*` endpoints
- Functions work exactly like in production
- Email logs to console (no real email sending)

### **Production Mode** 
- Vercel automatically deploys serverless functions
- Same `/api/*` endpoints work
- Real email sending via Nodemailer

## Setup Instructions

### **Option 1: Vercel CLI (Recommended)**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Run development with serverless functions:**
   ```bash
   npm run dev:vercel
   ```
   - This runs both frontend (port 3000) and API functions
   - All `/api/*` calls work automatically
   - No separate services needed

### **Option 2: Vite Only (Fallback)**

1. **Run frontend only:**
   ```bash
   npm run dev
   ```

2. **What happens:**
   - API calls fail gracefully
   - Credentials logged to console
   - System still works for testing

## File Structure

```
diplomat-connect/
├── api/                          # Vercel serverless functions
│   ├── send-email.js            # Email service
│   └── verify-passcode.js       # Passcode verification
├── src/
│   ├── pages/
│   │   ├── Login.jsx            # Main login page
│   │   └── VerifyCode.jsx       # New user verification
│   ├── components/auth/
│   │   └── PasswordResetModal.jsx
│   └── utils/
│       └── emailService.js      # Email utilities
└── vercel.json                  # Vercel configuration
```

## API Endpoints

### **POST /api/send-email**
- Sends welcome emails with credentials
- Uses Nodemailer in production
- Logs to console in development

### **POST /api/verify-passcode**
- Verifies UN-xxxx passcodes
- Creates new user accounts
- Returns temporary credentials

## Environment Variables

Create `.env.local` for development:

```env
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Email (for production)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="UNIConnect <noreply@uniconnect.com>"
```

## Testing the Flow

### **1. New User Registration:**
1. Go to `/login`
2. Click "Check" button
3. Enter email + valid passcode (UN-xxxx)
4. Check console for credentials
5. Login with temporary password
6. Reset password when prompted

### **2. Existing Users:**
1. Login normally
2. No password reset required
3. Direct access to dashboard

## Deployment to Vercel

1. **Connect to Vercel:**
   ```bash
   vercel
   ```

2. **Add environment variables in Vercel dashboard:**
   - All variables from `.env.local`
   - Email credentials for production

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## Why This Approach is Better

✅ **Single deployment** - Everything in one Vercel project  
✅ **No separate services** - Serverless functions handle everything  
✅ **Works everywhere** - Development, staging, production  
✅ **Automatic scaling** - Vercel handles infrastructure  
✅ **Cost effective** - Pay only for usage  

## Troubleshooting

### **API calls failing in development:**
- Make sure you're using `npm run dev:vercel`
- Check that Vercel CLI is installed
- Verify `.env.local` has correct variables

### **Email not sending in production:**
- Check Vercel environment variables
- Verify email credentials are correct
- Check Vercel function logs

The system is now properly architected for Vercel deployment! 🚀
