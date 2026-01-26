/**
 * API utilities for safe fetch and response handling
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

/**
 * Safe JSON parsing with error handling
 */
export async function safeJsonParse<T = any>(response: Response): Promise<ApiResponse<T>> {
  try {
    // Check if response has content
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {
        success: false,
        error: {
          message: `Invalid response type: ${contentType}`,
          code: 'INVALID_CONTENT_TYPE'
        }
      };
    }

    // Clone response to read it multiple times if needed
    const cloned = response.clone();
    const text = await cloned.text();
    
    if (!text || text.trim() === '') {
      return {
        success: false,
        error: {
          message: 'Empty response from server',
          code: 'EMPTY_RESPONSE'
        }
      };
    }

    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error('JSON parse error:', error);
    return {
      success: false,
      error: {
        message: 'Failed to parse server response',
        code: 'JSON_PARSE_ERROR'
      }
    };
  }
}

/**
 * Fetch with better error handling
 */
export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Parse JSON safely
    const data = await safeJsonParse<T>(response);

    // If response was not OK, add status info
    if (!response.ok) {
      return {
        ...data,
        success: false,
        error: {
          message: data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          code: data.error?.code || 'HTTP_ERROR'
        }
      };
    }

    return data;
  } catch (error) {
    console.error('API fetch error:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR'
      }
    };
  }
}

/**
 * Get API base URL
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
}
