# 🔐 OAuth Authentication Setup Guide

This guide will help you set up **Google Sign-In** and other **FREE** OAuth providers for SilkRoute.

> **Note**: Apple Sign-In has been removed as it requires a paid Apple Developer account ($99/year). This guide focuses on free alternatives.

---

## 📋 Prerequisites

- Google Cloud Console account (FREE)
- SilkRoute backend running on port 5000
- SilkRoute frontend running on port 3000

---

## 🔵 Google OAuth Setup (Recommended - FREE & Easy)

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

### Step 4: Restart Server

```bash
cd frontend
npm run dev
```

✅ **Done!** Google Sign-In should now work!

---

## 🆓 FREE OAuth Alternatives

### 1. 🐙 GitHub OAuth (Highly Recommended)

**Pros:** 
- Completely free
- Easy setup
- Developer-friendly
- No complex verification needed

**Setup:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: SilkRoute
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**

**Add to NextAuth:**
```typescript
import GitHubProvider from "next-auth/providers/github"

providers: [
  GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  }),
]
```

---

### 2. 🎮 Discord OAuth (Popular & Free)

**Pros:**
- Free
- Fast approval
- Good for gaming/community apps
- Young user demographic

**Setup:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it "SilkRoute"
4. Go to **OAuth2** tab
5. Add redirect: `http://localhost:3000/api/auth/callback/discord`
6. Copy **Client ID** and **Client Secret**

**Add to NextAuth:**
```typescript
import DiscordProvider from "next-auth/providers/discord"

providers: [
  DiscordProvider({
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  }),
]
```

---

### 3. 🔷 Microsoft/Azure AD (Free)

**Pros:**
- Free for personal Microsoft accounts
- Professional appearance
- Enterprise-ready

**Setup:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
5. Create a **Client Secret** in Certificates & secrets
6. Copy **Application (client) ID**, **Directory (tenant) ID**, and **Client Secret**

**Add to NextAuth:**
```typescript
import AzureADProvider from "next-auth/providers/azure-ad"

providers: [
  AzureADProvider({
    clientId: process.env.AZURE_AD_CLIENT_ID,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    tenantId: process.env.AZURE_AD_TENANT_ID,
  }),
]
```

---

### 4. 📘 Facebook OAuth (Free but Complex)

**Pros:**
- Large user base
- Free

**Cons:**
- Complex setup
- Requires app review for production
- Privacy concerns

**Setup:**
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create an app
3. Add **Facebook Login** product
4. Configure OAuth redirect URI
5. Get **App ID** and **App Secret**

**Add to NextAuth:**
```typescript
import FacebookProvider from "next-auth/providers/facebook"

providers: [
  FacebookProvider({
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  }),
]
```

---

### 5. 🐦 Twitter/X OAuth

**Note:** Twitter's API has changed significantly. Free tier is limited.

---

## ✅ Recommended Setup for SilkRoute

Based on your use case (marketplace for farmers/vendors/buyers in India):

### **Best Options:**
1. **Google** ✅ (Already implemented)
   - Most Indians have Gmail
   - Easy to use
   - Trusted

2. **GitHub** 🐙 (Easy to add)
   - For tech-savvy users
   - Developer-friendly
   - Completely free

3. **Microsoft** 🔷 (Professional)
   - Enterprise users
   - Professional appearance

### **Skip:**
- ❌ Facebook (complex setup, privacy concerns)
- ❌ Discord (too niche for marketplace)
- ❌ Apple (paid account required)

---

## 🔧 Adding a New Provider (GitHub Example)

### 1. Install Provider (if needed)

```bash
cd frontend
# NextAuth includes most providers by default
```

### 2. Update NextAuth Config

Edit `frontend/src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import GitHubProvider from "next-auth/providers/github"

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    // ... credentials provider
  ],
  // ... rest of config
}
```

### 3. Update Environment Variables

Add to `frontend/.env.local`:

```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 4. Add Button to UI

Edit `frontend/src/app/auth/page.tsx`:

```tsx
<button
  onClick={() => handleOAuthSignIn('github')}
  disabled={loading}
  className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-3 rounded-full font-medium hover:bg-gray-800 transition"
>
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
  Continue with GitHub
</button>
```

### 5. Update Handler Type

```typescript
const handleOAuthSignIn = async (provider: 'google' | 'github') => {
  // ...
}
```

---

## 🚨 Common Issues

### Issue: "Redirect URI mismatch"
**Solution**: Make sure the redirect URI in OAuth console exactly matches:
- Google: `http://localhost:3000/api/auth/callback/google`
- GitHub: `http://localhost:3000/api/auth/callback/github`

### Issue: "Invalid client"
**Solution**: 
- Check Client ID is correct
- Ensure no extra spaces in `.env.local`
- Restart dev server after changing env vars

### Issue: "NEXTAUTH_SECRET not configured"
**Solution**: Add `NEXTAUTH_SECRET` to `.env.local`

```bash
# Generate a secret
openssl rand -base64 32
```

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

### 2. Update OAuth Settings

Add production URLs to each provider:
- **Authorized origins**: `https://yourdomain.com`
- **Redirect URIs**: `https://yourdomain.com/api/auth/callback/{provider}`

### 3. Security Checklist

- [ ] Use strong NEXTAUTH_SECRET (32+ characters)
- [ ] Enable HTTPS in production
- [ ] Restrict OAuth redirect URIs to your domain only
- [ ] Add CORS restrictions in backend
- [ ] Implement rate limiting
- [ ] Remove unused OAuth providers

---

## 📊 Comparison of Free OAuth Providers

| Provider | Ease of Setup | User Base | Best For | Rating |
|----------|--------------|-----------|----------|--------|
| **Google** | ⭐⭐⭐⭐⭐ Easy | Huge (India) | General users | ✅ Best |
| **GitHub** | ⭐⭐⭐⭐⭐ Easy | Developers | Tech users | ✅ Great |
| **Microsoft** | ⭐⭐⭐⭐ Moderate | Professional | Enterprise | ✅ Good |
| **Discord** | ⭐⭐⭐⭐ Easy | Gamers/Communities | Niche | ⚠️ Limited |
| **Facebook** | ⭐⭐ Complex | Large | General (complex) | ⚠️ Skip |
| ~~Apple~~ | ~~❌ Paid~~ | ~~iOS users~~ | ~~❌ Requires $99/year~~ | ❌ Removed |

---

## 🎯 Quick Start (Google Only - Current Setup)

If you just want to test Google Sign-In:

1. **Get Google credentials** (see Google OAuth Setup above)
2. **Update `.env.local`** with your Client ID and Secret
3. **Restart server**: `npm run dev`
4. **Test**: Go to `/auth` and click "Continue with Google"

That's it! Google Sign-In should work immediately.

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend is running (http://localhost:5000)
- [ ] Frontend is running (http://localhost:3000)
- [ ] `.env.local` has GOOGLE_CLIENT_ID and SECRET
- [ ] Google OAuth credentials are configured
- [ ] Can click "Continue with Google"
- [ ] Gets redirected to Google login
- [ ] After login, redirects back to dashboard
- [ ] User info shows in navbar
- [ ] User is saved in database (check with email/password login)

---

## 📚 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Guide](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)

---

Need help? Check the console logs in browser (F12) and terminal output for error messages!

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
