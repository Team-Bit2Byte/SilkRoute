const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for now
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// DB Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Initialize tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            user_type TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            vendor_id TEXT,
            name TEXT,
            price REAL,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            room_id TEXT,
            sender_id TEXT,
            original_text TEXT,
            translated_text TEXT,
            language TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
  }
});

const { translateText } = require('./services/translator');
const { getMandiRates } = require('./services/priceEngine');

// ... (previous setup)

// Basic Route
app.get('/', (req, res) => {
  res.send('SilkRoute Backend is Running');
});

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, userType } = req.body;
  
  if (!name || !email || !password || !userType) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const userId = require('uuid').v4();
  
  db.run(
    'INSERT INTO users (id, name, email, password, user_type) VALUES (?, ?, ?, ?, ?)',
    [userId, name, email, password, userType], // Note: In production, hash the password
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Registration failed' });
      }
      res.json({ 
        success: true, 
        user: { id: userId, name, email, userType }
      });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get(
    'SELECT id, name, email, user_type FROM users WHERE email = ? AND password = ?',
    [email, password], // Note: In production, compare hashed passwords
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      res.json({ 
        success: true, 
        user: { id: user.id, name: user.name, email: user.email, userType: user.user_type }
      });
    }
  );
});

// Price Route
app.get('/api/prices', (req, res) => {
    res.json(getMandiRates());
});

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    // data = { roomId, senderId, text, targetLang }
    
    // 1. Translate
    const translatedText = await translateText(data.text, data.targetLang);
    
    // 2. Broadcast
    const msgPayload = {
        ...data,
        translated_text: translatedText,
        timestamp: new Date().toISOString()
    };
    
    io.to(data.roomId).emit('receive_message', msgPayload);
    
    // TODO: Store in DB
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// Function to find available port
const findAvailablePort = (startPort) => {
  return new Promise((resolve) => {
    const testServer = require('net').createServer();
    testServer.listen(startPort, () => {
      const port = testServer.address().port;
      testServer.close(() => resolve(port));
    });
    testServer.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
};

// Start server on available port
findAvailablePort(PORT).then(availablePort => {
  server.listen(availablePort, () => {
    console.log(`Server is running on port ${availablePort}`);
    console.log(`Backend API: http://localhost:${availablePort}`);
  });
});
