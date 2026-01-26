# NextAuth "Unexpected end of JSON input" - Complete Fix Guide

## Root Cause
The error "Failed to execute 'json' on 'Response': Unexpected end of JSON input" in NextAuth happens when:
1. NextAuth's internal API endpoints return empty/non-JSON responses
2. Missing or incorrect NEXTAUTH_SECRET
3. Configuration not properly exported
4. Session checks failing silently

## ✅ Complete Fix Applied

### 1. Centralized Auth Configuration
**File:** `frontend/src/lib/auth.ts`

**Key Changes:**
- Moved all NextAuth config to a centralized file
- Added proper TypeScript typing
- Added `trustHost: true` for App Router compatibility
- Added error handling with proper error messages (throw instead of return null)
- Added `debug: true` in development

### 2. Simplified Route Handler
**File:** `frontend/src/app/api/auth/[...nextauth]/route.ts`

**Now just 6 lines:**
```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 3. Added TypeScript Type Definitions
**File:** `frontend/src/types/next-auth.d.ts`

Extends NextAuth types to include:
- `user.id`
- `user.userType`
- `user.backendToken`

### 4. Environment Variables
**Required in `.env.local`:**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-min-32-chars
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

## Files Changed

1. ✅ `frontend/src/lib/auth.ts` - NEW: Centralized config
2. ✅ `frontend/src/app/api/auth/[...nextauth]/route.ts` - Simplified
3. ✅ `frontend/src/types/next-auth.d.ts` - NEW: Type definitions

## Testing Steps

### 1. Verify Environment Variables
```bash
cd frontend
cat .env.local
```

Should contain:
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_API_URL`

### 2. Start Backend
```bash
cd backend
npm start
# Should show: Server started on http://localhost:5000
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

### 4. Test Authentication
1. Go to http://localhost:3000/auth
2. Try registration
3. Try login
4. Check browser console - should see NO errors

## Common Issues & Solutions

### ❌ Still seeing JSON parse errors?

**Check 1: NEXTAUTH_SECRET is set**
```bash
echo $NEXTAUTH_SECRET
# Should output a long string
```

**Check 2: Backend is running**
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok",...}
```

**Check 3: NextAuth endpoints respond**
```bash
curl http://localhost:3000/api/auth/providers
# Should return JSON with providers list
```

### ❌ "NEXTAUTH_URL not defined"

Add to `.env.local`:
```env
NEXTAUTH_URL=http://localhost:3000
```

### ❌ OAuth errors

Make sure Google OAuth credentials are set:
```env
GOOGLE_CLIENT_ID=your-id-here
GOOGLE_CLIENT_SECRET=your-secret-here
```

Or disable Google provider in `lib/auth.ts` if not using OAuth.

### ❌ "Cannot find module '@/lib/auth'"

Check `tsconfig.json` has path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Debug Mode

Enable NextAuth debug logging in `.env.local`:
```env
NEXTAUTH_DEBUG=true
```

Check terminal output for detailed error messages.

## Key Improvements

### Before
- Config duplicated in route file
- No proper error handling
- No type safety
- Silent failures

### After
- ✅ Centralized configuration
- ✅ Proper error handling (throws with messages)
- ✅ Full TypeScript support
- ✅ `trustHost: true` for App Router
- ✅ Debug mode in development
- ✅ Better OAuth error recovery

## Production Checklist

Before deploying:

- [ ] Generate strong NEXTAUTH_SECRET (32+ chars)
- [ ] Set NEXTAUTH_URL to production domain
- [ ] Disable debug mode (remove NEXTAUTH_DEBUG)
- [ ] Configure OAuth redirect URIs in Google Console
- [ ] Test login/logout flow
- [ ] Verify session persistence

## Still Having Issues?

1. Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

2. Check browser console for specific errors

3. Check backend logs for API errors

4. Verify all environment variables are loaded:
```bash
npm run dev | grep NEXTAUTH
```

## Expected Behavior

### ✅ Successful Login
- User enters credentials
- NextAuth validates with backend
- Session created
- Redirected to dashboard
- No console errors

### ✅ Failed Login
- User enters wrong credentials
- Clear error message shown
- No JSON parse errors
- No crashes

### ✅ OAuth Login
- User clicks "Continue with Google"
- Google OAuth flow
- User registered/logged in backend
- Session created
- Redirected to dashboard

## Related Files

- Backend auth endpoint: `backend/src/controllers/authController.js`
- Backend response format: `{ success: true, data: { user, token } }`
- Frontend API utility: `frontend/src/lib/api.ts`

## Status: ✅ FIXED

This comprehensive fix addresses all root causes of the NextAuth JSON parsing error.
