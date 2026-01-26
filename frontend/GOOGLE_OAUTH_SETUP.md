# Google OAuth Setup Guide for SilkRoute

## Overview
SilkRoute uses NextAuth.js for authentication, supporting both:
- **Email/Password** (Credentials) - Always enabled
- **Google OAuth** - Optional, requires setup

## ✅ Current Status

### Backend OAuth Endpoint
- ✅ **Working**: `/api/auth/oauth` endpoint tested successfully
- ✅ **Response Format**: Returns `{ success: true, data: { user, token } }`
- ✅ **Secure Passwords**: Uses `crypto.randomBytes(32)` for OAuth users

### Frontend Configuration
- ✅ **Smart Provider Detection**: Google OAuth only enabled if credentials configured
- ✅ **Graceful Fallback**: Works with or without Google OAuth
- ✅ **Console Feedback**: Shows OAuth status on startup

## 🚀 How to Enable Google OAuth

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "NEW PROJECT"
   - Name it "SilkRoute" or any name you prefer
   - Click "Create"

3. **Enable Google+ API** (if not already enabled)
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (for testing) or "Internal" (for organization use)
   - Fill in required fields:
     - App name: `SilkRoute`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip "Scopes" for now (click "Save and Continue")
   - Add test users if using "External" type
   - Click "Back to Dashboard"

5. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `SilkRoute Web Client`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     http://localhost:3001
     https://yourdomain.com  (for production)
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:3000/api/auth/callback/google
     http://localhost:3001/api/auth/callback/google
     https://yourdomain.com/api/auth/callback/google  (for production)
     ```
   - Click "Create"
   - **Copy the Client ID and Client Secret** (you'll need these!)

### Step 2: Configure Environment Variables

Edit `frontend/.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="Xb/dNdq9aTGe/UWeCru2XqP0siXA3t/2H1vcVv1JzcU="

# Google OAuth - REPLACE WITH YOUR CREDENTIALS
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 3: Restart Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
✅ Google OAuth enabled
```

### Step 4: Test Google OAuth

1. Go to http://localhost:3000/auth
2. You should see a "Continue with Google" button
3. Click it
4. Sign in with your Google account
5. You'll be redirected back and logged in! 🎉

## 🔍 How It Works

### Frontend Flow
```
User clicks "Continue with Google"
        ↓
NextAuth redirects to Google OAuth
        ↓
User logs in with Google
        ↓
Google redirects back with auth code
        ↓
NextAuth exchanges code for user info
        ↓
Frontend calls backend /api/auth/oauth
        ↓
Backend creates/finds user account
        ↓
Backend returns JWT token
        ↓
User logged in! ✅
```

### Backend Processing
```typescript
// frontend/src/lib/auth.ts - OAuth callback
if (account && account.provider !== 'credentials') {
  // Register OAuth user in backend
  const res = await fetch(`${apiUrl}/api/auth/oauth`, {
    method: 'POST',
    body: JSON.stringify({
      email: user.email,
      name: user.name,
      provider: account.provider,
      providerId: account.providerAccountId,
      userType: 'buyer'
    })
  })
  
  // Store backend token in NextAuth session
  token.backendToken = data.data.token
}
```

### Backend OAuth Handler
```typescript
// backend/src/controllers/authController.js
const oauthLogin = async (req, res) => {
  const { email, name, provider, providerId, userType } = req.body;
  
  // Check if user exists
  let user = await database.get('SELECT * FROM users WHERE email = ?', [email]);
  
  if (!user) {
    // Create new user with secure random password
    const oauthPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(oauthPassword, 12);
    await database.run('INSERT INTO users ...');
  }
  
  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email }, secret);
  
  res.json({ success: true, data: { user, token } });
}
```

## 🛠️ Configuration Details

### Smart Provider Detection
The frontend automatically detects if Google OAuth is configured:

```typescript
// frontend/src/lib/auth.ts
if (process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  providers.unshift(GoogleProvider({...}));
  console.log('✅ Google OAuth enabled');
} else {
  console.log('ℹ️  Google OAuth disabled');
}
```

### Authorization Parameters
```typescript
authorization: {
  params: {
    prompt: "consent",       // Always show consent screen
    access_type: "offline",  // Get refresh token
    response_type: "code"    // Authorization code flow
  }
}
```

## 🐛 Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution:** Add exact redirect URI to Google Console:
```
http://localhost:3000/api/auth/callback/google
```

### Issue: "Access blocked: This app's request is invalid"
**Solution:** 
1. Check OAuth consent screen is configured
2. Add yourself as a test user if using "External" type
3. Verify app is not in "Production" status yet

### Issue: "Google OAuth button doesn't appear"
**Solution:**
1. Check console logs: Should see "✅ Google OAuth enabled"
2. If not, verify `.env.local` has correct credentials
3. Restart frontend: `npm run dev`

### Issue: "OAuth login works but backend fails"
**Solution:**
1. Ensure backend is running: `npm start` in backend folder
2. Check `NEXT_PUBLIC_API_URL` is correct in `.env.local`
3. Test backend endpoint:
   ```bash
   curl -X POST http://localhost:5000/api/auth/oauth \
     -H "Content-Type: application/json" \
     -d '{"email":"test@gmail.com","name":"Test","provider":"google","providerId":"123","userType":"buyer"}'
   ```

### Issue: "Token not synced to backend"
**Solution:** Check browser console for errors during OAuth callback

## 🔒 Security Notes

### OAuth User Passwords
- OAuth users get a **secure random password** (`crypto.randomBytes(32)`)
- This password is **never exposed** to the user
- Users can only log in via OAuth (can't use password login)

### Token Storage
- Backend JWT token stored in NextAuth session
- Available as `session.user.backendToken`
- Used for authenticated API calls

### User Types
- Default: OAuth users are created as `buyer`
- Can be changed in callback: `userType: 'farmer'` or `'vendor'`

## 📊 Testing OAuth Flow

### Manual Test
```bash
# 1. Backend should be running
cd backend && npm start

# 2. Frontend should be running  
cd frontend && npm run dev

# 3. Open browser
# Visit: http://localhost:3000/auth

# 4. Click "Continue with Google"

# 5. Sign in with Google

# 6. Check backend logs - should see:
[INFO] OAuth authentication successful | { userId: "...", provider: "google" }

# 7. Check frontend - should be logged in and redirected to dashboard
```

### Automated Test (Backend Only)
```bash
curl -X POST http://localhost:5000/api/auth/oauth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testgoogle@example.com",
    "name": "Test Google User",
    "provider": "google",
    "providerId": "google123456",
    "userType": "buyer"
  }'

# Expected response:
{
  "success": true,
  "message": "OAuth authentication successful",
  "data": {
    "user": {
      "id": "...",
      "name": "Test Google User",
      "email": "testgoogle@example.com",
      "userType": "buyer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 📝 Environment Variables Reference

### Required for NextAuth
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### Required for Google OAuth
```env
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### Required for Backend Integration
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## ✅ Verification Checklist

Before going live:
- [ ] Google OAuth credentials obtained
- [ ] Environment variables configured
- [ ] Redirect URIs match exactly
- [ ] OAuth consent screen configured
- [ ] Test users added (if External mode)
- [ ] Backend OAuth endpoint tested
- [ ] Frontend OAuth button visible
- [ ] Full OAuth flow tested
- [ ] User created in database
- [ ] Session persists after login
- [ ] Backend token synced correctly

## 🎉 Success Indicators

When everything is working:
- ✅ Console shows: "✅ Google OAuth enabled"
- ✅ "Continue with Google" button visible on `/auth` page
- ✅ Clicking button opens Google sign-in popup
- ✅ After sign-in, user is logged in
- ✅ User is redirected to dashboard
- ✅ Session persists on page refresh
- ✅ Backend has user record with OAuth provider info

## 📚 Additional Resources

- NextAuth.js Docs: https://next-auth.js.org/providers/google
- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2
- Google Cloud Console: https://console.cloud.google.com/

## Status: ✅ READY FOR GOOGLE OAUTH

The backend and frontend are fully configured. Just add your Google credentials to enable it!
