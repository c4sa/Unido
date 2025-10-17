# ⚡ Quick Start Guide

Get diplomat-connect running with Supabase in 30 minutes.

## 🎯 Prerequisites

- Node.js 18+
- Supabase account (free)
- Google account

## 🚀 Steps

### 1. Create Supabase Project (5 min)

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Name: `diplomat-connect`
4. Generate & save database password
5. Choose region (closest to you)
6. Wait for project to be ready

### 2. Set Up Database (2 min)

1. In Supabase dashboard, click "SQL Editor"
2. Open `supabase-schema.sql` from this project
3. Copy all content
4. Paste in SQL Editor
5. Click "Run" (Ctrl+Enter)
6. Should see: "Success. No rows returned"

### 3. Configure Google OAuth (10 min)

#### Google Cloud Console:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project or select existing
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Type: Web application
6. Add authorized redirect URI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Replace YOUR_PROJECT_REF with your Supabase project ref)
7. Copy Client ID & Secret

#### Supabase Dashboard:
1. Go to "Authentication" > "Providers"
2. Enable "Google"
3. Paste Client ID
4. Paste Client Secret
5. Save

### 4. Get API Credentials (1 min)

1. In Supabase: "Settings" > "API"
2. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJ...`

### 5. Configure Environment (2 min)

```bash
# Create .env file
cp env.template .env

# Edit .env
# Add your Supabase URL and key
```

Your `.env` should look like:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Install & Run (5 min)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173`

### 7. Test (5 min)

#### Authentication Testing:
- [ ] Open `http://localhost:5173` - Should show **Login page**
- [ ] **Option 1 - Google OAuth (Recommended):**
  - [ ] Click "Google OAuth" tab (default)
  - [ ] Click "Sign in with Google"
  - [ ] Authorize the app in Google OAuth
  - [ ] Should redirect to **Dashboard**
- [ ] **Option 2 - Email/Password (Enhancement):**
  - [ ] Click "Email/Password" tab
  - [ ] Click "Sign Up" sub-tab
  - [ ] Fill in: Full Name, Email, Password, Confirm Password
  - [ ] Click "Create Account"
  - [ ] Check email for confirmation (if enabled in Supabase)
  - [ ] Sign in with your email and password

#### Application Testing:
- [ ] Create/edit profile
- [ ] Browse delegates
- [ ] Send test meeting request

## ✅ Done!

Your app is now running with Supabase!

## 🐛 Problems?

### Error: "Missing Supabase environment variables"
- Check `.env` file exists
- Restart dev server: Ctrl+C, then `npm run dev`

### Error: Google sign-in fails
- Verify redirect URL in Google Cloud Console matches exactly
- Check Client ID and Secret in Supabase are correct

### Error: Can't see any data
- Make sure you're logged in
- Check browser console for errors
- Verify database schema was created (Supabase > Table Editor)

### Still stuck?
Read the detailed guides:
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Full setup guide
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration details
- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Implementation status

## 🎉 What's Next?

Now that it's running:

1. **Create first admin user**:
   - Sign in with Google
   - Go to Supabase > Table Editor > users
   - Find your user
   - Change `role` from `user` to `admin`
   - Refresh app - you'll see admin menu!

2. **Add venue rooms** (as admin):
   - Click "Rooms" in sidebar
   - Add your meeting rooms

3. **Invite users**:
   - Share the app URL with colleagues
   - They sign in with Google
   - Profiles auto-created

4. **Configure for production**:
   - Update Google OAuth for production domain
   - Set up monitoring
   - Deploy (Vercel, Netlify, etc.)

---

**That's it!** You've successfully migrated from base44 to Supabase! 🎉

