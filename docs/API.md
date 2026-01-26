# 🔌 SilkRoute API Reference

> **Version:** 1.0.0  
> **Base URL:** `http://localhost:5000`  
> **Protocol:** REST + WebSocket (Socket.IO)

## 📑 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Price Management](#price-management)
- [Translation](#translation)
- [Real-Time Communication](#real-time-communication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

---

## Overview

The SilkRoute API provides REST endpoints for user management, price discovery, translation services, and WebSocket endpoints for real-time chat functionality.

### API Characteristics

- **Format**: JSON
- **Authentication**: JWT Tokens
- **CORS**: Enabled for `http://localhost:3000` (configurable)
- **Rate Limiting**: Not implemented (planned)
- **Versioning**: None (v1 implicit)

### Base Response Structure

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## Authentication

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required, 2-100 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)",
  "userType": "string (required, enum: farmer|vendor|buyer)"
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "c5f8ef4a-3b8c-4ef3-9cfc-aaf9e0eb0146",
    "name": "John Doe",
    "email": "john@example.com",
    "userType": "buyer"
  }
}
```

**Error Responses:**
```json
// 400 Bad Request - Missing fields
{
  "error": "Name, email, password, and userType are required"
}

// 400 Bad Request - Duplicate email
{
  "error": "User with this email already exists"
}

// 500 Internal Server Error
{
  "error": "Registration failed"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securePass123",
    "userType": "buyer"
  }'
```

---

### Login User

Authenticate user and receive session token.

**Endpoint:** `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "c5f8ef4a-3b8c-4ef3-9cfc-aaf9e0eb0146",
    "name": "John Doe",
    "email": "john@example.com",
    "userType": "buyer"
  }
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Email and password are required"
}

// 401 Unauthorized
{
  "error": "Invalid email or password"
}

// 500 Internal Server Error
{
  "error": "Login failed"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePass123"
  }'
```

---

### OAuth Authentication

Authenticate or register user via OAuth provider (Google, Apple, etc.).

**Endpoint:** `POST /api/auth/oauth`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "string (required)",
  "name": "string (required)",
  "provider": "string (required, e.g., google)",
  "providerId": "string (required, provider's user ID)",
  "userType": "string (optional, default: buyer)"
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "668d7417-bf0b-4a68-8bb7-ea4a4bfc798c",
      "name": "John Doe",
      "email": "john@gmail.com",
      "userType": "buyer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Behavior:**
- If user exists (by email): Returns existing user
- If user doesn't exist: Creates new user with secure random password

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/oauth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@gmail.com",
    "name": "John Doe",
    "provider": "google",
    "providerId": "google-user-id-123456",
    "userType": "buyer"
  }'
```

---

## Price Management

### Get Mandi Rates

Retrieve current wholesale market prices for agricultural products.

**Endpoint:** `GET /api/prices`

**Headers:** None required

**Query Parameters:** None

**Success Response:** `200 OK`
```json
[
  {
    "item": "Potato",
    "price": 20,
    "unit": "kg",
    "trend": "up"
  },
  {
    "item": "Onion",
    "price": 35,
    "unit": "kg",
    "trend": "down"
  },
  {
    "item": "Tomato",
    "price": 40,
    "unit": "kg",
    "trend": "up"
  },
  {
    "item": "Rice",
    "price": 50,
    "unit": "kg",
    "trend": "stable"
  },
  {
    "item": "Wheat",
    "price": 28,
    "unit": "kg",
    "trend": "up"
  },
  {
    "item": "Carrot",
    "price": 32,
    "unit": "kg",
    "trend": "stable"
  }
]
```

**Field Descriptions:**
- `item` (string): Product name
- `price` (number): Price per unit in INR
- `unit` (string): Measurement unit (kg, quintal, ton)
- `trend` (string): Price trend (up, down, stable)

**cURL Example:**
```bash
curl http://localhost:5000/api/prices
```

---

### Estimate Fair Price

Calculate fair price using AI algorithms based on historical data.

**Endpoint:** `POST /api/prices/estimate`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "prices": [
    {
      "price": 100,
      "date": "2026-01-20"
    },
    {
      "price": 110,
      "date": "2026-01-21"
    },
    {
      "price": 120,
      "date": "2026-01-22"
    },
    {
      "price": 105,
      "date": "2026-01-23"
    },
    {
      "price": 115,
      "date": "2026-01-24"
    }
  ],
  "method": "median"
}
```

**Field Descriptions:**
- `prices` (array, required): Array of price objects with `price` (number) and optional `date` (ISO 8601)
- `method` (string, optional): Calculation method
  - `median` (default): Most robust against outliers
  - `average`: Simple arithmetic mean
  - `weighted`: Time-decay weighted average (recent prices weighted higher)

**Success Response:** `200 OK`
```json
{
  "success": true,
  "fairPrice": 110,
  "method": "median",
  "sampleSize": 5,
  "stats": {
    "min": 100,
    "max": 120,
    "average": 110,
    "median": 110,
    "stdDev": 7.07
  }
}
```

**Field Descriptions:**
- `fairPrice` (number): Calculated fair price
- `method` (string): Method used for calculation
- `sampleSize` (number): Number of prices analyzed
- `stats` (object): Statistical analysis
  - `min`: Minimum price
  - `max`: Maximum price
  - `average`: Arithmetic mean
  - `median`: Middle value
  - `stdDev`: Standard deviation

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Prices array is required"
}

// 500 Internal Server Error
{
  "error": "Price estimation failed"
}
```

**Algorithm Details:**

**Median Calculation:**
```javascript
// Sort prices and take middle value
// Best for: Datasets with outliers
sorted = [100, 105, 110, 115, 120]
median = sorted[2] = 110
```

**Average Calculation:**
```javascript
// Simple arithmetic mean
// Best for: Normal distributions
average = (100 + 105 + 110 + 115 + 120) / 5 = 110
```

**Weighted Average:**
```javascript
// Time-decay formula: weight = 1 / (1 + days_difference * 0.1)
// Recent prices have higher weight
// Best for: Trending markets

price1: 100 (5 days ago) → weight = 1/(1+5*0.1) = 0.67
price2: 105 (4 days ago) → weight = 1/(1+4*0.1) = 0.71
price3: 110 (3 days ago) → weight = 1/(1+3*0.1) = 0.77
price4: 115 (2 days ago) → weight = 1/(1+2*0.1) = 0.83
price5: 120 (1 day ago)  → weight = 1/(1+1*0.1) = 0.91

weighted_avg = (100*0.67 + 105*0.71 + 110*0.77 + 115*0.83 + 120*0.91) / (0.67+0.71+0.77+0.83+0.91)
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/prices/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [
      {"price": 100, "date": "2026-01-20"},
      {"price": 110, "date": "2026-01-21"},
      {"price": 120, "date": "2026-01-22"},
      {"price": 105, "date": "2026-01-23"},
      {"price": 115, "date": "2026-01-24"}
    ],
    "method": "median"
  }'
```

---

## Translation

### Translate Text

Translate text between supported languages with confidence scoring.

**Endpoint:** `POST /api/translate`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "string (required, max 5000 chars)",
  "sourceLang": "string (optional, default: auto)",
  "targetLang": "string (required)"
}
```

**Supported Languages:**
- `en` - English
- `hi` - Hindi (हिन्दी)
- `bn` - Bengali (বাংলা)
- `ta` - Tamil (தமிழ்)
- `tg` - Telugu (తెలుగు)
- `auto` - Auto-detect (for sourceLang only)

**Success Response:** `200 OK`
```json
{
  "success": true,
  "original": "Hello, how are you?",
  "translated": "नमस्ते, आप कैसे हैं?",
  "sourceLang": "en",
  "targetLang": "hi",
  "confidence": 0.85
}
```

**Field Descriptions:**
- `original` (string): Input text
- `translated` (string): Translated text
- `sourceLang` (string): Detected or specified source language
- `targetLang` (string): Target language
- `confidence` (number): Translation confidence (0-1 scale)
  - `0.9-1.0`: Excellent
  - `0.7-0.9`: Good
  - `0.5-0.7`: Fair
  - `0.0-0.5`: Low

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Text and targetLang are required"
}

// 500 Internal Server Error
{
  "error": "Translation failed"
}
```

**Features:**
- **Auto Language Detection**: Uses `franc` library for source language identification
- **Translation Caching**: LRU cache (1000 items) for performance
- **Fallback Handling**: Returns original text on translation failure
- **Mock Translation**: Current implementation prefixes `[LANG]` for demo
- **LibreTranslate Ready**: Integration ready for production translation

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "sourceLang": "auto",
    "targetLang": "hi"
  }'
```

**JavaScript Example:**
```javascript
const translateText = async (text, targetLang) => {
  const response = await fetch('http://localhost:5000/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      sourceLang: 'auto',
      targetLang
    })
  });
  
  const data = await response.json();
  return data;
};

// Usage
const result = await translateText('Hello', 'hi');
console.log(result.translated); // "नमस्ते"
```

---

## Real-Time Communication

### Socket.IO Events

Real-time chat with automatic translation using WebSocket protocol.

**Connection URL:** `http://localhost:5000`

**Transport:** WebSocket (fallback to polling)

### Connect to Server

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

### Event: `join_room`

Join a chat room to send/receive messages.

**Emit:**
```javascript
socket.emit('join_room', roomId);
```

**Parameters:**
- `roomId` (string): Unique room identifier

**Server Behavior:**
- Adds socket to room
- Logs join event
- No response emitted

**Example:**
```javascript
const roomId = 'negotiation-room-123';
socket.emit('join_room', roomId);
console.log(`Joined room: ${roomId}`);
```

---

### Event: `send_message`

Send a message with automatic translation to target language.

**Emit:**
```javascript
socket.emit('send_message', {
  roomId: 'string (required)',
  senderId: 'string (required)',
  text: 'string (required)',
  targetLang: 'string (required)'
});
```

**Parameters:**
- `roomId`: Room identifier
- `senderId`: User ID sending the message
- `text`: Message content (max 5000 chars)
- `targetLang`: Target language code (en, hi, bn, ta, tg)

**Server Processing:**
1. Detects source language automatically
2. Translates text to target language
3. Broadcasts to all room members
4. Adds timestamp and confidence score

**No Direct Response** - Listen to `receive_message` event

**Example:**
```javascript
socket.emit('send_message', {
  roomId: 'negotiation-room-123',
  senderId: 'user-uuid-456',
  text: 'What is your best price for potatoes?',
  targetLang: 'hi'
});
```

---

### Event: `receive_message`

Receive translated messages from other room members.

**Listen:**
```javascript
socket.on('receive_message', (data) => {
  console.log('New message:', data);
});
```

**Data Structure:**
```json
{
  "roomId": "negotiation-room-123",
  "senderId": "user-uuid-456",
  "text": "What is your best price for potatoes?",
  "targetLang": "hi",
  "translated_text": "आलू के लिए आपकी सबसे अच्छी कीमत क्या है?",
  "confidence": 0.85,
  "timestamp": "2026-01-26T17:39:30.859Z"
}
```

**Field Descriptions:**
- `roomId`: Chat room identifier
- `senderId`: Message sender's user ID
- `text`: Original message text
- `targetLang`: Target language for translation
- `translated_text`: Translated message
- `confidence`: Translation confidence (0-1)
- `timestamp`: ISO 8601 timestamp

**Example:**
```javascript
socket.on('receive_message', (message) => {
  // Display original text
  console.log('Original:', message.text);
  
  // Display translation
  console.log('Translated:', message.translated_text);
  
  // Check confidence
  if (message.confidence < 0.7) {
    console.warn('Low confidence translation');
  }
  
  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString();
  console.log('Sent at:', time);
});
```

---

### Event: `disconnect`

Socket disconnection event (automatic).

**Listen:**
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**Disconnect Reasons:**
- `io server disconnect`: Server closed the connection
- `io client disconnect`: Client called `socket.disconnect()`
- `ping timeout`: Client didn't respond to ping
- `transport close`: Underlying transport closed
- `transport error`: Transport error occurred

**Server Behavior:**
- Removes socket from all rooms
- Logs disconnect event
- Cleans up resources

---

### Complete Chat Example

```javascript
import io from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:5000');

// Room and user IDs
const roomId = 'negotiation-room-123';
const userId = 'user-abc-456';

// Connection established
socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Join chat room
  socket.emit('join_room', roomId);
  console.log(`✅ Joined room: ${roomId}`);
});

// Listen for incoming messages
socket.on('receive_message', (message) => {
  console.log('\n📨 New Message:');
  console.log('From:', message.senderId);
  console.log('Original:', message.text);
  console.log('Translated:', message.translated_text);
  console.log('Confidence:', message.confidence);
  console.log('Time:', new Date(message.timestamp).toLocaleString());
});

// Send a message
const sendMessage = (text, targetLang = 'hi') => {
  socket.emit('send_message', {
    roomId,
    senderId: userId,
    text,
    targetLang
  });
  console.log('✅ Message sent');
};

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

// Handle errors
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Example usage
setTimeout(() => {
  sendMessage('Hello, I want to buy potatoes', 'hi');
}, 2000);

setTimeout(() => {
  sendMessage('What is your best price?', 'hi');
}, 4000);
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful request |
| `400` | Bad Request | Invalid/missing parameters |
| `401` | Unauthorized | Invalid credentials |
| `404` | Not Found | Resource doesn't exist |
| `500` | Internal Server Error | Server-side error |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `MISSING_FIELDS` | Required fields missing | Check request body |
| `INVALID_CREDENTIALS` | Wrong email/password | Verify credentials |
| `USER_EXISTS` | Email already registered | Use different email |
| `DATABASE_ERROR` | Database operation failed | Retry or contact support |
| `TRANSLATION_ERROR` | Translation failed | Retry or check input |
| `VALIDATION_ERROR` | Input validation failed | Check field formats |

---

## Rate Limiting

**Status:** Not currently implemented

**Planned Limits:**
- General API: 100 requests/minute
- Authentication: 10 requests/minute
- Translation: 50 requests/minute
- Price Estimation: 30 requests/minute

---

## Examples

### Complete User Flow

```javascript
// 1. Register
const register = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Farmer John',
    email: 'john@farm.com',
    password: 'secure123',
    userType: 'farmer'
  })
});
const user = await register.json();
console.log('Registered:', user.user.id);

// 2. Login
const login = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@farm.com',
    password: 'secure123'
  })
});
const session = await login.json();
console.log('Logged in:', session.user.name);

// 3. Get market prices
const prices = await fetch('http://localhost:5000/api/prices');
const mandiRates = await prices.json();
console.log('Potato price:', mandiRates[0].price);

// 4. Estimate fair price
const estimate = await fetch('http://localhost:5000/api/prices/estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prices: [
      { price: 18, date: '2026-01-20' },
      { price: 20, date: '2026-01-21' },
      { price: 22, date: '2026-01-22' }
    ],
    method: 'median'
  })
});
const fairPrice = await estimate.json();
console.log('Fair price:', fairPrice.fairPrice);

// 5. Translate message
const translation = await fetch('http://localhost:5000/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'I have fresh potatoes',
    sourceLang: 'auto',
    targetLang: 'hi'
  })
});
const translated = await translation.json();
console.log('Translated:', translated.translated);

// 6. Connect to chat
const socket = io('http://localhost:5000');
socket.on('connect', () => {
  socket.emit('join_room', 'potato-negotiation-1');
  
  socket.emit('send_message', {
    roomId: 'potato-negotiation-1',
    senderId: user.user.id,
    text: 'I have 100kg potatoes at ₹20/kg',
    targetLang: 'hi'
  });
});

socket.on('receive_message', (msg) => {
  console.log('Received:', msg.translated_text);
});
```

---

## Changelog

### Version 1.0.0 (2026-01-26)
- Initial API release
- REST endpoints for auth, prices, translation
- WebSocket support for real-time chat
- Multi-language translation
- AI price estimation

---

## Support

For API support:
- **Documentation**: [Full Docs](../README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/SilkRoute/issues)
- **Email**: api-support@silkroute.com

---

<div align="center">

**SilkRoute API v1.0.0**

[⬆ Back to Top](#-silkroute-api-reference)

</div>
