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
            username TEXT,
            language TEXT,
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
