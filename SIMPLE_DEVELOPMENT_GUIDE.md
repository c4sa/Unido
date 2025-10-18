# Simple Development Guide

## ✅ **Perfect! Now it works with `npm run dev`**

Your email service will work perfectly with regular Vite development. Here's how:

## **How It Works Now:**

### **Development Mode (`npm run dev`):**
- ✅ **No Vercel CLI needed**
- ✅ **Email service works** - logs to console
- ✅ **Passcode verification works** - uses direct Supabase calls
- ✅ **All functionality intact**

### **Production Mode (Vercel deployment):**
- ✅ **Real email sending** via serverless functions
- ✅ **Same functionality** as development
- ✅ **Automatic scaling**

## **Quick Start:**

```bash
# Just run this - no Vercel CLI needed!
npm run dev
```

## **What You'll See in Development:**

### **Console Output:**
```
🔧 DEVELOPMENT MODE - Using direct Supabase verification...
📧 DEVELOPMENT MODE - Email would be sent:
📧 To: test@example.com
🔑 Temporary Password: VQDmrbo6LMVs
🌐 Login URL: http://localhost:5173/login
📧 Subject: Welcome to UNIConnect - Your Account Credentials
ℹ️  In production, this will be sent via email automatically.
```

### **Database Updates:**
- ✅ User created with `is_password_reset: true`
- ✅ Passcode marked as used
- ✅ Password reset works correctly

## **Testing the Flow:**

1. **Go to:** `http://localhost:5173/login`
2. **Click:** "Check" button
3. **Enter:** Email + valid passcode (UN-xxxx)
4. **Check console** for credentials
5. **Login** with temporary password
6. **Reset password** when prompted

## **Deployment to Vercel:**

1. **Connect to Vercel:**
   ```bash
   vercel
   ```

2. **Add environment variables** in Vercel dashboard

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## **Why This is Better:**

✅ **Simple development** - Just `npm run dev`  
✅ **No extra tools** - No Vercel CLI needed  
✅ **Works everywhere** - Dev, staging, production  
✅ **Same codebase** - No changes needed  
✅ **Real functionality** - Everything works in both modes  

**That's it!** Your system now works perfectly with regular Vite development and deploys seamlessly to Vercel. 🚀
