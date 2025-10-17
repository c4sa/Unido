# 🔧 Troubleshooting Guide

## Email/Password Authentication Issues

### ❌ Error: "Email not confirmed" (Even with Confirmation Disabled)

**Error Message:**
```
AuthApiError: Email not confirmed
```

**Cause:**
You signed up **before** disabling email confirmation. The user account is stuck in "unconfirmed" state.

---

## ✅ Solutions

### Solution 1: Confirm User via Supabase Dashboard (Easiest)

1. Open Supabase Dashboard
2. Go to **Authentication** → **Users**
3. Find your user account (search by email)
4. Look at the "Confirmed" column
5. If it shows ❌ or empty:
   - Click on the user row to open details
   - Look for **"Confirm email"** button or toggle
   - Click it to manually confirm the user
6. Try signing in again ✓

### Solution 2: Confirm User via SQL (Recommended for Multiple Users)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Run this query:

```sql
-- Confirm a specific user by email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-email@example.com';
```

Or confirm **all unconfirmed users**:

```sql
-- Confirm ALL unconfirmed users (use carefully!)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

4. Click **Run**
5. Try signing in again ✓

### Solution 3: Delete and Recreate User

**ONLY if you don't have important data associated with this user:**

1. Open Supabase Dashboard
2. Go to **Authentication** → **Users**
3. Find your user account
4. Click the **trash icon** to delete
5. Make sure email confirmation is **OFF**:
   - Go to **Authentication** → **Providers** → **Email**
   - Disable "Confirm email"
6. Go back to your app at `http://localhost:5173/login`
7. Sign up again with the same email ✓

---

## 🔒 Prevent This Issue

### Before Creating New Accounts

**Ensure email confirmation is disabled:**

1. Supabase Dashboard
2. **Authentication** → **Providers**
3. Click **Email** provider
4. Look for "Confirm email" setting
5. **Uncheck/Disable** it
6. **Save** changes

**Now new signups will work without confirmation!**

---

## 📋 Verify Your Settings

### Check Current Email Provider Settings

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Click on **Email**
3. Verify these settings:

```
✅ Enable Email provider: ON
❌ Confirm email: OFF          ← Must be OFF for no confirmation
✅ Secure email change: ON
✅ Enable sign-ups: ON
```

### Check Email Auth Settings

1. Go to **Authentication** → **Email Auth**
2. Verify:

```
❌ Enable email confirmations: OFF    ← Must be OFF
✅ Enable password recovery: ON
✅ Enable email change confirmations: ON (optional)
```

---

## 🧪 Test After Fix

1. Open `http://localhost:5173/login`
2. Click "Email/Password" tab
3. Click "Sign In"
4. Enter your email and password
5. Click "Sign In"
6. ✅ Should redirect to Dashboard!

---

## 🚨 If Still Not Working

### Check for Other Issues

1. **Wrong Password?**
   - Try resetting password via Supabase dashboard
   - Or recreate the user

2. **User Doesn't Exist?**
   - Check in **Authentication** → **Users**
   - Verify email address spelling

3. **Supabase URL/Key Wrong?**
   - Check `.env` file
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Restart dev server: `npm run dev`

4. **Browser Cache?**
   - Clear browser cache
   - Try incognito/private mode
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## 📝 Quick Reference: Email Confirmation Settings

### Development (No Email Setup)
```
Confirm email: OFF
This allows instant signup without email verification
```

### Production (With Email Setup)
```
Confirm email: ON
Setup SMTP in Supabase → Settings → SMTP Settings
Users receive confirmation email before login
```

---

## 🎯 Recommended Settings for Your Current Setup

Since you **haven't set up SMTP yet**, use these settings:

### Supabase Dashboard → Authentication → Providers → Email:
- ✅ Enable Email provider: **ON**
- ❌ Confirm email: **OFF** ← Important!
- ✅ Enable sign-ups: **ON**

### Supabase Dashboard → Authentication → Email Auth:
- ❌ Enable email confirmations: **OFF** ← Important!
- ✅ Enable password recovery: **OFF** (needs SMTP)
- ❌ Secure email change: **OFF** (needs SMTP)

**These settings work WITHOUT any email/SMTP configuration.**

---

## 💡 When to Enable Email Confirmation

**Enable it when:**
- ✅ You've configured SMTP (Settings → SMTP Settings)
- ✅ You've tested email delivery
- ✅ You're ready for production
- ✅ You want to prevent spam accounts

**Until then, keep it OFF for development.**

---

## 🔄 Migration Note

If you're migrating from base44:
- base44 used Google OAuth ONLY (no email confirmation needed)
- Email/Password is a NEW enhancement
- Google OAuth still works the same way (no confirmation required)

---

## 📞 Still Stuck?

1. Check Supabase logs:
   - Dashboard → Logs → Auth Logs
   - Look for failed login attempts

2. Check browser console:
   - F12 → Console tab
   - Look for detailed error messages

3. Verify user status in SQL:
   ```sql
   SELECT 
     id, 
     email, 
     email_confirmed_at,
     created_at
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```
   
   If `email_confirmed_at` is NULL → User not confirmed → Use Solution 1 or 2 above

---

**Last Updated:** October 2025

