/**
 * NextAuth configuration
 * Centralized config to prevent duplicate definitions
 */

import type { NextAuthConfig } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  userType?: string;
  token?: string;
}

// Build providers array dynamically based on available credentials
const providers: any[] = [
  CredentialsProvider({
    id: 'credentials',
    name: 'Credentials',
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        const res = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
          }),
          cache: 'no-store'
        })

        if (!res.ok) {
          return null
        }

        const contentType = res.headers.get("content-type")
        if (!contentType?.includes("application/json")) {
          return null
        }

        const data = await res.json()

        if (data.success && data.data?.user && data.data?.token) {
          return {
            id: data.data.user.id,
            email: data.data.user.email,
            name: data.data.user.name,
            userType: data.data.user.userType,
            token: data.data.token
          }
        }

        return null
      } catch (error) {
        console.error('Auth error:', error)
        return null
      }
    }
  })
];

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  );
  console.log('✅ Google OAuth enabled');
} else {
  console.log('ℹ️  Google OAuth disabled - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local');
}

export const authOptions: NextAuthConfig = {
  providers,
  callbacks: {
    async jwt({ token, user, account }: any) {
      // Initialize token with defaults if missing
      if (!token.id) {
        token.id = token.sub || 'unknown'
      }
      if (!token.userType) {
        token.userType = 'buyer'
      }
      if (!token.backendToken) {
        token.backendToken = ''
      }

      if (user) {
        token.id = user.id
        token.userType = (user as ExtendedUser).userType || 'buyer'
        token.backendToken = (user as ExtendedUser).token || ''
        
        // OAuth login - register to backend
        if (account && account.provider !== 'credentials') {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            const res = await fetch(`${apiUrl}/api/auth/oauth`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                provider: account.provider,
                providerId: account.providerAccountId,
                userType: 'buyer'
              }),
              cache: 'no-store'
            })
            
            if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
              const data = await res.json()
              if (data.success && data.data?.user && data.data?.token) {
                token.id = data.data.user.id
                token.userType = data.data.user.userType
                token.backendToken = data.data.token
              }
            }
          } catch (error) {
            console.error('OAuth backend sync error:', error)
          }
        }
      }
      return token
    },
    async session({ session, token }: any) {
      // Always return a valid session
      if (session.user) {
        session.user.id = (token.id as string) || 'unknown'
        session.user.userType = (token.userType as string) || 'buyer'
        session.user.backendToken = (token.backendToken as string) || ''
      }
      return session
    }
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-please-change',
  debug: false,
}

