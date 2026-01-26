'use client';

import { useEffect } from 'react';

export default function AuthErrorBoundary() {
  useEffect(() => {
    // Catch NextAuth JSON parse errors and prevent them from crashing the app
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      // Check URL first
      const url = args[0]?.toString() || '';
      const isAuthUrl = url.includes('/api/auth/');

      try {
        const response = await originalFetch(...args);
        
        // Clone the response so we can read it
        const clonedResponse = response.clone();
        
        // If this is a NextAuth endpoint and returns empty/non-JSON, return a valid empty JSON response
        if (isAuthUrl) {
          try {
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
              // Return empty JSON for non-JSON responses from auth endpoints
              return new Response('{}', {
                status: response.status,
                statusText: response.statusText,
                headers: { 'content-type': 'application/json' }
              });
            }
            
            // Check if response is empty
            const text = await clonedResponse.text();
            if (!text || text.trim() === '') {
              // Return empty JSON for empty responses
              return new Response('{}', {
                status: response.status,
                statusText: response.statusText,
                headers: { 'content-type': 'application/json' }
              });
            }
          } catch (e) {
            // If we can't check, return the original response
            return response;
          }
        }
        
        return response;
      } catch (error) {
        // Handle network errors (Failed to fetch)
        console.error('Fetch error:', error);
        
        // If this is an auth URL and we have a network error, return a safe empty response
        // to prevent NextAuth from crashing the app
        if (isAuthUrl) {
            return new Response(JSON.stringify({ error: 'Network error' }), {
                status: 500, // Or 503 Service Unavailable
                statusText: 'Network Error',
                headers: { 'content-type': 'application/json' }
            });
        }
        
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
  return null;
}
