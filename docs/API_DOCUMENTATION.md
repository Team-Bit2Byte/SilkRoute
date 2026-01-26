# API Documentation

## Overview
SilkRoute provides a comprehensive REST API for managing users, authentication, products, and real-time communication. All endpoints follow RESTful conventions and return JSON responses.

## Base URL
- Development: `http://localhost:5000`
- Production: `https://your-domain.com`

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <jwt-token>
```

## Response Format
All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2024-01-26T12:00:00.000Z",
    "details": [] // Optional validation details
  }
}
```

## Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **General API endpoints**: 100 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "userType": "farmer"
}
```

**Validation Rules:**
- `name`: 2-100 characters, letters and spaces only
- `email`: Valid email address
- `password`: 8+ characters, must contain uppercase, lowercase, and number
- `userType`: Must be "farmer", "vendor", or "buyer"

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "userType": "farmer"
    },
    "token": "jwt-token"
  }
}
```

### Login User
Authenticate existing user.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "userType": "farmer"
    },
    "token": "jwt-token"
  }
}
```

### OAuth Login
Authenticate using OAuth providers.

**Endpoint:** `POST /api/auth/oauth`

**Request Body:**
```json
{
  "email": "john@example.com",
  "name": "John Doe",
  "provider": "google",
  "providerId": "google-user-id",
  "userType": "buyer"
}
```

**Supported Providers:** `google`, `github`, `discord`, `azure`

### Get Profile
Get current user profile.

**Endpoint:** `GET /api/auth/profile`
**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "userType": "farmer",
      "language": "en",
      "createdAt": "2024-01-26T12:00:00.000Z"
    }
  }
}
```

### Update Profile
Update user profile information.

**Endpoint:** `PUT /api/auth/profile`
**Authentication:** Required

**Request Body:**
```json
{
  "name": "John Smith",
  "language": "hi"
}
```

**Supported Languages:** `en`, `hi`, `bn`, `ta`

### Logout
Logout current user (client-side token removal).

**Endpoint:** `POST /api/auth/logout`
**Authentication:** Required

### Refresh Token
Refresh authentication token.

**Endpoint:** `POST /api/auth/refresh`
**Authentication:** Required

## Data Endpoints

### Get Mandi Prices
Retrieve current market prices for agricultural commodities.

**Endpoint:** `GET /api/prices`
**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "message": "Mandi prices retrieved successfully",
  "data": {
    "prices": {
      "commodities": {
        "potato": {
          "name": "Potato",
          "unit": "per quintal",
          "avgPrice": 1225,
          "trend": "stable",
          "changePercent": 2.5,
          "rates": [
            {
              "market": "Delhi Azadpur",
              "price": 1200,
              "currency": "INR",
              "lastUpdated": "2024-01-26T10:00:00Z"
            }
          ]
        }
      },
      "metadata": {
        "totalCommodities": 5,
        "lastUpdated": "2024-01-26T12:00:00Z",
        "source": "Mock Mandi API"
      }
    },
    "lastUpdated": "2024-01-26T12:00:00Z"
  }
}
```

### Get Products
Retrieve products with pagination and search.

**Endpoint:** `GET /api/products`
**Authentication:** Optional (for personalization)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `q`: Search query
- `category`: Filter by category

**Example:** `GET /api/products?page=1&limit=20&q=potato&category=vegetables`

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "pages": 0
    },
    "filters": {
      "search": "potato",
      "category": "vegetables"
    }
  }
}
```

### Get User Products
Retrieve current user's products.

**Endpoint:** `GET /api/user/products`
**Authentication:** Required

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Get Statistics
Get application statistics.

**Endpoint:** `GET /api/stats`
**Authentication:** Not required

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "totalUsers": 0,
    "totalProducts": 0,
    "totalTransactions": 0,
    "activeChats": 0
  }
}
```

## Health Check

### Server Health
Check server and database health.

**Endpoint:** `GET /health`
**Authentication:** Not required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-26T12:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "database": "connected"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_ERROR` | Authentication required or failed |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND_ERROR` | Resource not found |
| `CONFLICT_ERROR` | Resource conflict (e.g., email exists) |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service error |
| `INTERNAL_ERROR` | Internal server error |

## HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |

## WebSocket API

### Connection
Connect to WebSocket server with authentication:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'jwt-token'
  }
});
```

### Events

#### Join Room
```javascript
socket.emit('join_room', { roomId: 'uuid-room-id' });

// Response
socket.on('room_joined', (data) => {
  // { roomId, timestamp }
});
```

#### Leave Room
```javascript
socket.emit('leave_room', { roomId: 'uuid-room-id' });
```

#### Send Message
```javascript
socket.emit('send_message', {
  roomId: 'uuid-room-id',
  text: 'Hello, how much for potatoes?',
  targetLang: 'hi',
  username: 'John'
});
```

#### Receive Message
```javascript
socket.on('receive_message', (message) => {
  // {
  //   id: 'message-uuid',
  //   roomId: 'room-uuid',
  //   senderId: 'user-uuid',
  //   username: 'John',
  //   text: 'Hello, how much for potatoes?',
  //   translatedText: 'नमस्ते, आलू के लिए कितना?',
  //   targetLang: 'hi',
  //   timestamp: '2024-01-26T12:00:00.000Z'
  // }
});
```

#### Get Message History
```javascript
socket.emit('get_message_history', {
  roomId: 'uuid-room-id',
  limit: 50,
  offset: 0
});

socket.on('message_history', (data) => {
  // { roomId, messages: [], hasMore: boolean }
});
```

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing_start', { roomId: 'uuid-room-id' });

// Stop typing
socket.emit('typing_stop', { roomId: 'uuid-room-id' });

// Receive typing status
socket.on('user_typing', (data) => {
  // { userId, userEmail, isTyping: boolean }
});
```

#### User Events
```javascript
socket.on('user_joined', (data) => {
  // { userId, userEmail, timestamp }
});

socket.on('user_left', (data) => {
  // { userId, userEmail, timestamp }
});
```

#### Error Handling
```javascript
socket.on('error', (error) => {
  // { message, code }
});
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Register user
const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get mandi prices
const getMandiPrices = async () => {
  try {
    const response = await api.get('/prices');
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};
```

### Python
```python
import requests

class SilkRouteAPI:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url
        self.token = None
    
    def set_token(self, token):
        self.token = token
    
    def _headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def register_user(self, user_data):
        response = requests.post(
            f"{self.base_url}/auth/register",
            json=user_data,
            headers=self._headers()
        )
        return response.json()
    
    def get_mandi_prices(self):
        response = requests.get(
            f"{self.base_url}/prices",
            headers=self._headers()
        )
        return response.json()
```

## Postman Collection

A Postman collection is available with all API endpoints pre-configured. Import the collection and set the following environment variables:

- `base_url`: `http://localhost:5000`
- `jwt_token`: Your authentication token

## Testing

### Unit Tests
```bash
cd backend
npm test
```

### Integration Tests
```bash
cd backend
npm run test:integration
```

### Load Testing
```bash
# Using Artillery
npm install -g artillery
artillery run load-test.yml
```

## Changelog

### v1.0.0 (2024-01-26)
- Initial API release
- Authentication endpoints
- Mandi price data
- WebSocket communication
- Comprehensive error handling
- Rate limiting
- Input validation
