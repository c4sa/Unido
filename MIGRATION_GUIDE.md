# 🚀 Base44 to Supabase Migration Guide

This guide will help you migrate your diplomat-connect application from base44 to Supabase.

## 📋 Prerequisites

Before starting the migration:

- [ ] Node.js 18+ installed
- [ ] Supabase account created at [supabase.com](https://supabase.com)
- [ ] Google Cloud Console access for OAuth configuration
- [ ] Export of all data from base44 (if you have existing data)

## 🏗️ Step 1: Create Supabase Project

1. **Sign up/Login to Supabase**

   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New Project"
2. **Configure Project**

   - Organization: Select or create
   - Project Name: `diplomat-connect` (or your preferred name)
   - Database Password: Generate a strong password (save it securely!)
   - Region: Choose closest to your users
   - Click "Create new project"
3. **Wait for Setup**

   - Project creation takes 1-2 minutes
   - You'll see a success message when ready

## 🗄️ Step 2: Set Up Database Schema

1. **Open SQL Editor**

   - In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. **Run Schema Script**

   - Open the file `supabase-schema.sql` in your project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press Ctrl+Enter
   - You should see: "Success. No rows returned"
3. **Verify Tables Created**

   - Click "Table Editor" in left sidebar
   - You should see these tables:
     - users
     - meeting_requests
     - chat_messages
     - venue_rooms
     - venue_bookings
     - notifications

## 🔐 Step 3: Configure Google OAuth

### 3.1 Google Cloud Console Setup

1. **Go to Google Cloud Console**

   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Select your project or create a new one
2. **Enable Google+ API**

   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
3. **Create OAuth Credentials**

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "diplomat-connect-supabase"
4. **Configure Authorized URLs**

   - Get your Supabase project URL from: Project Settings > API
   - Add Authorized JavaScript origins:
     ```
     http://localhost:5173
     https://your-domain.com
     ```
   - Add Authorized redirect URIs:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - Replace `YOUR_PROJECT_REF` with your actual project reference
5. **Save Credentials**

   - Copy the "Client ID" and "Client Secret"
   - You'll need these for Supabase configuration

### 3.2 Supabase OAuth Configuration

1. **Go to Authentication Settings**

   - In Supabase dashboard: Authentication > Providers
2. **Enable Google Provider**

   - Toggle "Google" to ON
   - Paste your Google "Client ID"
   - Paste your Google "Client Secret"
   - Click "Save"
3. **Configure Site URL**

   - Go to Authentication > URL Configuration
   - Site URL: `http://localhost:5173` (for development)
   - Add production URL when deploying
   - Redirect URLs: Add your app URLs

## 🔑 Step 4: Configure Environment Variables

1. **Get Supabase Credentials**

   - In Supabase dashboard: Settings > API
   - Copy "Project URL"
   - Copy "anon public" key
2. **Create .env File**

   - Copy `env.template` to `.env` in project root:

   ```bash
   cp env.template .env
   ```
3. **Update .env**

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
4. **Verify .gitignore**

   - Ensure `.env` is in `.gitignore` (it should be by default)

## 📦 Step 5: Install Dependencies

```bash
# Remove old packages
npm uninstall @base44/sdk

# Install Supabase
npm install @supabase/supabase-js

# Install all dependencies
npm install
```

## 🗂️ Step 6: Data Migration (Optional)

If you have existing data in base44, you'll need to migrate it.

### 6.1 Export from base44

**Option A: Manual Export via base44 Dashboard**

1. Contact base44 support to request data export
2. They should provide JSON or CSV files

**Option B: Programmatic Export**
Create a script to export data using base44 SDK (before removing it):

```javascript
// export-base44-data.js
import { base44 } from './src/api/base44Client.js';

async function exportData() {
  const data = {
    users: await base44.entities.User.list(),
    meetingRequests: await base44.entities.MeetingRequest.list(),
    chatMessages: await base44.entities.ChatMessage.list(),
    venueRooms: await base44.entities.VenueRoom.list(),
    venueBookings: await base44.entities.VenueBooking.list(),
    notifications: await base44.entities.Notification.list()
  };
  
  // Save to file
  fs.writeFileSync('base44-export.json', JSON.stringify(data, null, 2));
  console.log('Export complete!');
}

exportData();
```

### 6.2 Transform Data

You'll need to:

- Map base44 user IDs to Supabase UUIDs
- Convert date formats if needed
- Ensure referential integrity

### 6.3 Import to Supabase

Use the Supabase client to import data:

```javascript
// import-to-supabase.js
import { supabase } from './src/api/supabaseClient.js';
import fs from 'fs';

async function importData() {
  const data = JSON.parse(fs.readFileSync('base44-export.json'));
  
  // Import users first (they're referenced by other tables)
  for (const user of data.users) {
    await supabase.from('users').insert({
      // Map fields appropriately
      email: user.email,
      full_name: user.full_name,
      // ... other fields
    });
  }
  
  // Then import rooms, meetings, messages, bookings, notifications
  // ... (similar pattern for each table)
}

importData();
```

## 🧪 Step 7: Test the Application

1. **Start Development Server**

   ```bash
   npm run dev
   ```
2. **Test Authentication**

   - Open http://localhost:5173
   - Click "Sign in with Google"
   - Authorize the application
   - Verify you're redirected to dashboard
3. **Test Core Features**

   - [ ] User profile creation and editing
   - [ ] Browse delegates
   - [ ] Send meeting request
   - [ ] Accept/decline meeting request
   - [ ] Chat functionality
   - [ ] Book venue
   - [ ] Notifications (should appear instantly with real-time!)
   - [ ] Admin functions (if you have admin role)
4. **Test Real-time Features**

   - [ ] Open app in two browser windows
   - [ ] Send a message in one window
   - [ ] Verify it appears instantly in the other
   - [ ] Same for notifications

## 🚨 Troubleshooting

### Issue: "Missing Supabase environment variables"

- **Solution**: Verify `.env` file exists and has correct values
- Restart dev server after creating `.env`

### Issue: "Not authenticated" error

- **Solution**:
  - Check Google OAuth is configured correctly
  - Verify redirect URLs match exactly
  - Clear browser cache and cookies

### Issue: "Row Level Security" errors

- **Solution**:
  - Verify RLS policies were created (check SQL script)
  - Make sure you're authenticated
  - Check that user exists in `public.users` table

### Issue: Real-time not working

- **Solution**:
  - Verify tables are added to realtime publication (check SQL script)
  - Check browser console for WebSocket errors
  - Ensure your Supabase project has realtime enabled

### Issue: Data not visible after migration

- **Solution**:
  - Check RLS policies aren't blocking access
  - Verify foreign key relationships are correct
  - Check that user IDs were mapped correctly during import

## 🎯 Next Steps After Migration

1. **Update Production Environment**

   - Set production environment variables
   - Update Google OAuth redirect URLs for production domain
   - Deploy application
2. **Monitor Performance**

   - Check Supabase dashboard for query performance
   - Monitor realtime connection count
   - Review database indexes
3. **Optimize**

   - Add indexes for frequently queried fields
   - Consider enabling database caching
   - Set up Supabase Edge Functions for complex operations
4. **Security Review**

   - Review all RLS policies
   - Test unauthorized access attempts
   - Ensure sensitive data is properly protected
5. **User Communication**

   - Inform users about new features (real-time updates!)
   - Update documentation
   - Provide support for any migration issues

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase logs: Dashboard > Logs
2. Review browser console errors
3. Check Network tab for failed requests
4. Consult Supabase Discord community
5. Review this migration guide again

## ✅ Migration Checklist

- [ ] Supabase project created
- [ ] Database schema created (SQL script run)
- [ ] Google OAuth configured
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Data migrated (if applicable)
- [ ] Authentication tested
- [ ] All features tested
- [ ] Real-time features verified
- [ ] Production deployment configured
- [ ] Users notified of changes

---

**Congratulations!** 🎉 You've successfully migrated from base44 to Supabase!
