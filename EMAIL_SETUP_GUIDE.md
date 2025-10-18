# 📧 Email Setup Guide - Vercel Development

## ✅ Implementation Complete

Your email functionality has been successfully updated to work with Vercel's development server. Here's what was changed and how to use it:

## 🔧 Changes Made

### 1. **Package.json Scripts Updated**
```json
{
  "scripts": {
    "dev": "vercel dev",        // ← Now uses Vercel dev server
    "dev:vite": "vite",         // ← Backup for Vite-only development
    // ... other scripts unchanged
  }
}
```

### 2. **Email Service Improved**
- ✅ Removed fallback simulation mode
- ✅ Added proper error handling with specific messages
- ✅ Clean console logging for debugging
- ✅ Real email sending in both development and production

### 3. **Vercel Configuration Enhanced**
```json
{
  "functions": {
    "api/send-email.js": { "maxDuration": 10 },
    "api/verify-passcode.js": { "maxDuration": 10 }
  }
}
```

### 4. **Environment Template Updated**
- ✅ Clear instructions for `.env.local` setup
- ✅ Gmail App Password setup guide
- ✅ Development vs production configuration

## 🚀 How to Use

### **Step 1: Install Vercel CLI Globally**
```bash
npm install -g vercel
```

### **Step 2: Install Project Dependencies**
```bash
npm install
```

### **Step 3: Create Environment File**
```bash
# Copy the template
cp env.template .env.local

# Edit .env.local with your actual credentials
```

### **Step 3: Configure Gmail App Password**
1. Enable 2-Factor Authentication on Gmail
2. Go to Google Account Settings > Security > App passwords
3. Generate app password for "Mail"
4. Use this password in `.env.local`

### **Step 4: Run Development Server**
```bash
npm run dev
```

**What happens:**
- ✅ Vercel dev server starts (usually on port 3000)
- ✅ Your React app loads
- ✅ Serverless functions available at `/api/*`
- ✅ **REAL emails will be sent** using your Gmail SMTP

## 📧 Email Functionality

### **Development Mode:**
- ✅ Real emails sent via Gmail SMTP
- ✅ Console shows email sending status
- ✅ Proper error messages if configuration is wrong

### **Production Mode:**
- ✅ Same serverless functions
- ✅ Environment variables from Vercel dashboard
- ✅ Identical behavior to development

## 🔍 Error Messages

The system now provides clear error messages:

- **"Email service unavailable"** → Server not running, use `npm run dev`
- **"Email API endpoint not found"** → Serverless function issue
- **"Connection refused"** → Vercel dev server not running
- **Specific SMTP errors** → Gmail configuration issues

## 🧪 Testing Email

### **Test in Development:**
1. Start server: `npm run dev`
2. Go to Profile page
3. Try password reset or any email feature
4. Check console for email sending logs
5. Check your email inbox

### **Common Issues & Solutions:**

| Issue | Solution |
|-------|----------|
| "Failed to fetch" | Run `npm run dev` instead of `npm run dev:vite` |
| SMTP auth error | Check Gmail app password in `.env.local` |
| Port already in use | Kill other processes or use different port |
| Environment variables not loaded | Ensure `.env.local` exists and has correct format |

## 📁 File Structure

```
diplomat-connect/
├── api/
│   ├── send-email.js          ✅ Serverless function (unchanged)
│   └── verify-passcode.js     ✅ Serverless function (unchanged)
├── src/
│   └── lib/
│       └── emailService.js    ✅ Updated (no more simulation)
├── .env.local                 ✅ Create this file
├── env.template               ✅ Updated with instructions
├── package.json               ✅ Updated scripts
└── vercel.json                ✅ Updated configuration
```

## 🎯 Next Steps

1. **Create `.env.local`** with your Gmail credentials
2. **Run `npm run dev`** to start development
3. **Test email functionality** in the app
4. **Deploy to Vercel** when ready for production

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` (never committed)
- ✅ Use Gmail App Passwords (not regular password)
- ✅ Environment variables secure in Vercel dashboard
- ✅ CORS properly configured for security

## ✨ Benefits

- 🚀 **Single Command**: `npm run dev` runs everything
- 📧 **Real Emails**: Test actual email sending locally
- 🔧 **Better Debugging**: Clear error messages
- 🎯 **Production Parity**: Development matches production exactly
- 🛡️ **Secure**: Proper environment variable handling

---

**Your email functionality is now production-ready and will work seamlessly in both development and production environments!**
