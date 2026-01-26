# SilkRoute - Quick Reference Card

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Edit with your values
npm start
```

### Frontend  
```bash
cd frontend
npm install
cp .env.local.example .env.local  # Edit with your values
npm run dev
```

### Docker
```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
PORT=5000
JWT_SECRET=your-secret-here-32-chars-min
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env.local)
```env
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 📡 API Endpoints

### Register
```bash
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",  # Min 8 chars, 1 upper, 1 lower, 1 number
  "userType": "farmer"  # or "vendor", "buyer"
}
# Returns: { success: true, user: {...}, token: "jwt..." }
```

### Login
```bash
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
# Returns: { success: true, user: {...}, token: "jwt..." }
```

### Get Prices
```bash
GET /api/prices
# Returns: mandi rates data
```

---

## 🔌 Socket.io Usage

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'  // Required!
  }
});

socket.on('connect', () => {
  socket.emit('join_room', 'room-id');
});

socket.emit('send_message', {
  roomId: 'room-id',
  text: 'Hello',
  targetLang: 'hi',  // Hindi
  username: 'John'
});

socket.on('receive_message', (msg) => {
  console.log(msg.text);  // Original
  console.log(msg.translated_text);  // Translated
});
```

---

## 🔒 Security Features

| Feature | Enabled |
|---------|---------|
| Password Hashing (bcrypt) | ✅ |
| JWT Authentication | ✅ |
| CORS Whitelisting | ✅ |
| Rate Limiting | ✅ (5/15min auth, 100/15min API) |
| Input Validation | ✅ |
| Security Headers (Helmet) | ✅ |
| Socket.io Auth | ✅ |
| SQL Injection Protection | ✅ (Parameterized queries) |

---

## 🐛 Troubleshooting

### "Authentication required" on Socket.io
- Ensure you're passing the JWT token in auth
- Check token is valid (not expired)
- Verify backend JWT_SECRET matches

### "CORS policy" error
- Add your frontend URL to ALLOWED_ORIGINS in backend/.env
- Restart backend after changing .env

### "Invalid credentials" on login
- Password must meet complexity requirements
- Old plaintext passwords won't work (re-register)

### "Rate limit exceeded"
- Wait 15 minutes
- Or adjust RATE_LIMIT_MAX_REQUESTS in .env

### Port already in use
- Kill existing process: `lsof -ti:5000 | xargs kill`
- Or change PORT in backend/.env

---

## 📊 Monitoring

### Check backend logs
```bash
cd backend && npm start
# Watch for authentication attempts, errors
```

### Check database
```bash
cd backend
sqlite3 database.sqlite
.tables
SELECT * FROM users;
SELECT * FROM messages;
.exit
```

### Health check
```bash
curl http://localhost:5000/
# Should return: "SilkRoute Backend is Running"
```

---

## 🧪 Testing

### Test registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test1234","userType":"farmer"}'
```

### Test login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}'
```

### Test with authentication
```bash
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/protected-route
```

---

## 📦 Production Deployment

1. **Generate secrets**
   ```bash
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For NEXTAUTH_SECRET
   ```

2. **Update CORS**
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **Enable HTTPS**
   - Use reverse proxy (nginx/Apache)
   - Or Cloudflare
   - Or hosting platform SSL

4. **Database**
   - Migrate to PostgreSQL (recommended)
   - Or keep SQLite with regular backups

5. **Monitoring**
   - Set up error tracking (Sentry)
   - Set up logs (Winston/PM2)
   - Set up uptime monitoring

---

## 📞 Support

- **Issues**: Check logs first
- **Security**: Review SECURITY.md
- **API Docs**: See docs/api_endpoints.md
- **OAuth Setup**: See docs/OAUTH_SETUP.md

---

**Last Updated**: January 26, 2026  
**Version**: 1.0.0 (Production Ready)