# 🔐 OAuth Authentication Setup Guide

This guide will help you set up Google and Apple sign-in for SilkRoute.

---

## 📋 Prerequisites

- Google Cloud Console account
- Apple Developer account (for Apple Sign-In)
- SilkRoute backend running on port 5000
- SilkRoute frontend running on port 3000

---

## 🔵 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** (if not already enabled)

### Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: SilkRoute App
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
     - Add your production URL later
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - Add production URL later
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 3: Update Environment Variables

Open `frontend/.env.local` and add:

```env
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

---

## 🍎 Apple Sign-In Setup (Optional)

Apple Sign-In is more complex and requires:
- Apple Developer Program membership ($99/year)
- App ID configuration
- Services ID creation
- Private key generation

### Quick Setup (Simplified)

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Create a **Services ID**
3. Enable **Sign In with Apple**
4. Configure domains and redirect URLs:
   - Domain: `localhost` (for dev) or your production domain
   - Redirect URL: `http://localhost:3000/api/auth/callback/apple`
5. Create a **Private Key** for Sign in with Apple
6. Download the `.p8` key file

### Update Environment Variables

```env
APPLE_CLIENT_ID=com.yourcompany.silkroute
APPLE_CLIENT_SECRET=your-generated-secret
```

**Note**: Apple Sign-In secret generation requires converting the `.p8` key to JWT format. This is complex - consider using a service like [AppSignIn](https://www.appsignin.com/) or skipping Apple for now.

---

## ⚙️ Configuration Summary

### Required Files

**frontend/.env.local**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=silk-route-super-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Replace `NEXTAUTH_SECRET` with the generated value.

---

## 🧪 Testing OAuth

### Test Google Sign-In

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Go to http://localhost:3000/auth
4. Click **"Continue with Google"**
5. Select your Google account
6. Should redirect to dashboard after successful login
7. Check navbar - should show your Google name

### Verify in Database

```bash
cd backend
sqlite3 database.sqlite
SELECT * FROM users WHERE email LIKE '%gmail.com';
```

You should see your OAuth user with:
- `password` field containing `oauth_google_...`
- `user_type` set to `buyer` (default)

---

## 🔄 OAuth Flow Explanation

1. **User clicks "Continue with Google/Apple"**
2. Redirects to Google/Apple login page
3. User authorizes the app
4. Google/Apple redirects back with authorization code
5. NextAuth exchanges code for user profile
6. Backend creates/finds user in database
7. User is logged in and redirected to dashboard

---

## 🚨 Common Issues

### Issue: "Redirect URI mismatch"
**Solution**: Make sure the redirect URI in Google Console exactly matches:
- `http://localhost:3000/api/auth/callback/google`

### Issue: "Invalid client"
**Solution**: 
- Check `GOOGLE_CLIENT_ID` is correct
- Ensure no extra spaces in `.env.local`
- Restart the dev server after changing env vars

### Issue: "NEXTAUTH_SECRET not configured"
**Solution**: Add `NEXTAUTH_SECRET` to `.env.local` file

### Issue: OAuth user not showing in navbar
**Solution**: 
- Check backend `/api/auth/oauth` endpoint is working
- Verify backend is running on port 5000
- Check browser console for errors

---

## 🔒 Production Deployment

### 1. Update Environment Variables

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret-key-very-long-and-random
GOOGLE_CLIENT_ID=production-client-id
GOOGLE_CLIENT_SECRET=production-secret
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Update Google OAuth Settings

Add production URLs:
- **Authorized JavaScript origins**: `https://yourdomain.com`
- **Authorized redirect URIs**: `https://yourdomain.com/api/auth/callback/google`

### 3. Security Checklist

- [ ] Use strong NEXTAUTH_SECRET (at least 32 characters)
- [ ] Enable HTTPS in production
- [ ] Restrict OAuth redirect URIs to your domain only
- [ ] Add CORS restrictions in backend
- [ ] Implement rate limiting on auth endpoints

---

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign-In Guide](https://developer.apple.com/documentation/sign_in_with_apple)

---

## 🎯 Quick Start (Development)

If you just want to test without setting up OAuth:

1. **Skip OAuth setup** - The email/password login still works!
2. OAuth buttons will show but won't work without credentials
3. Users can still register and login normally

To hide OAuth buttons during development, comment out the OAuth section in:
`frontend/src/app/auth/page.tsx` (lines with Google/Apple buttons)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend is running (http://localhost:5000)
- [ ] Frontend is running (http://localhost:3000)
- [ ] `.env.local` has all required variables
- [ ] Google OAuth credentials are configured
- [ ] Can click "Continue with Google"
- [ ] Gets redirected to Google login
- [ ] After login, redirects back to dashboard
- [ ] User info shows in navbar
- [ ] User is saved in database

---

Need help? Check the console logs in browser (F12) and terminal output for error messages!
