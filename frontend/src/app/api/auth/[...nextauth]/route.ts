import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextRequest } from "next/server"

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
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
          // Call your backend API
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          })

          if (!res.ok) {
            console.error('Backend API error:', res.status, res.statusText)
            return null
          }

          const text = await res.text()
          if (!text) {
            console.error('Empty response from backend')
            return null
          }

          const data = JSON.parse(text)

          if (data.success && data.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              userType: data.user.userType
            } as any
          }

          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id
        token.userType = (user as any).userType || 'buyer' // Default to buyer for OAuth users
        
        // If OAuth login, save to backend
        if (account?.provider !== 'credentials') {
          try {
            // Register OAuth user in your backend
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/oauth`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                provider: account.provider,
                providerId: account.providerAccountId,
                userType: 'buyer' // Default for OAuth users
              })
            })
            
            if (res.ok) {
              const text = await res.text()
              if (text) {
                const data = JSON.parse(text)
                if (data.user) {
                  token.id = data.user.id
                  token.userType = data.user.userType
                }
              }
            }
          } catch (error) {
            console.error('OAuth backend registration error:', error)
          }
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).userType = token.userType
      }
      return session
    }
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: "jwt" as const
  }
}

const handler = NextAuth(authOptions) as any

export async function GET(req: NextRequest, context: any) {
  return handler(req, context)
}

export async function POST(req: NextRequest, context: any) {
  return handler(req, context)
}
