const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const path = require('path');

// Import AI modules
const PriceEstimator = require('../ai/price/priceEstimator.js');
const SimpleTranslationService = require('./services/SimpleTranslationService.js');

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

// Initialize AI services
const priceEstimator = new PriceEstimator();
const translationService = new SimpleTranslationService();

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

// OAuth endpoint (Google/Apple login)
app.post('/api/auth/oauth', (req, res) => {
  const { email, name, provider, providerId, userType } = req.body;
  
  if (!email || !name || !provider) {
    return res.status(400).json({ error: 'Email, name, and provider are required' });
  }

  // Check if user already exists
  db.get(
    'SELECT id, name, email, user_type FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (user) {
        // User exists, return their info
        return res.json({ 
          success: true, 
          user: { id: user.id, name: user.name, email: user.email, userType: user.user_type }
        });
      }
      
      // Create new user with OAuth
      const userId = require('uuid').v4();
      const defaultUserType = userType || 'buyer'; // Default to buyer for OAuth users
      
      db.run(
        'INSERT INTO users (id, name, email, password, user_type) VALUES (?, ?, ?, ?, ?)',
        [userId, name, email, `oauth_${provider}_${providerId}`, defaultUserType],
        function(insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: 'Failed to create user' });
          }
          res.json({ 
            success: true, 
            user: { id: userId, name, email, userType: defaultUserType }
          });
        }
      );
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

// Price Route - Enhanced with AI price estimation
app.get('/api/prices', (req, res) => {
    res.json(getMandiRates());
});

// AI Price Estimation Route
app.post('/api/prices/estimate', async (req, res) => {
    try {
        const { prices, method = 'median' } = req.body;
        
        if (!prices || !Array.isArray(prices)) {
            return res.status(400).json({ error: 'Prices array is required' });
        }

        const fairPrice = priceEstimator.calculateFairPrice(prices, method);
        
        res.json({
            success: true,
            fairPrice,
            method,
            sampleSize: prices.length
        });
    } catch (error) {
        console.error('Price estimation error:', error);
        res.status(500).json({ error: 'Price estimation failed' });
    }
});

// AI Translation Route
app.post('/api/translate', async (req, res) => {
    try {
        const { text, sourceLang = 'auto', targetLang } = req.body;
        
        if (!text || !targetLang) {
            return res.status(400).json({ error: 'Text and target language are required' });
        }

        const result = await translationService.translate(text, sourceLang, targetLang);
        
        res.json({
            success: true,
            original: text,
            translated: result.text || result,
            sourceLang: result.sourceLang || sourceLang,
            targetLang,
            confidence: result.confidence || null
        });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: 'Translation failed' });
    }
});

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
        // data = { roomId, senderId, text, targetLang }
        
        // 1. Translate using AI service
        const translatedText = await translationService.translate(
            data.text, 
            'auto', // Auto-detect source language
            data.targetLang
        );
        
        // 2. Broadcast
        const msgPayload = {
            ...data,
            translated_text: translatedText.text || translatedText,
            confidence: translatedText.confidence || null,
            timestamp: new Date().toISOString()
        };
        
        io.to(data.roomId).emit('receive_message', msgPayload);
        
        // TODO: Store in DB
    } catch (error) {
        console.error('Translation error:', error);
        // Send original message if translation fails
        const msgPayload = {
            ...data,
            translated_text: data.text,
            error: 'Translation failed',
            timestamp: new Date().toISOString()
        };
        io.to(data.roomId).emit('receive_message', msgPayload);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Backend API: http://localhost:${PORT}`);
});
