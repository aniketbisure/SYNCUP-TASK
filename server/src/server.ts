import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import { connectCache } from './config/redis.js';
import { getFeeds, createFeed } from './controllers/feedController.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = express();
const httpServer = createServer(app);

// Configure CORS for Express
app.use(cors({
  origin: [FRONTEND_URL, 'http://127.0.0.1:3000', 'https://syncup-task.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Set up Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_URL, 'http://127.0.0.1:3000', 'https://syncup-task.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Attach Socket.IO instance to Express App so controllers can access it
app.set('io', io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    websocketConnections: io.engine.clientsCount,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Coaching Feed endpoints
app.get('/api/feed', getFeeds);
app.post('/api/feed', createFeed);

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  // Handle Client Disconnection
  socket.on('disconnect', (reason) => {
    console.log(`[WebSocket] Client disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// Boot Server
const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Connect to Cache Caching Layer (Redis or In-Memory fallback)
    await connectCache();

    // 3. Listen on port
    httpServer.listen(PORT, () => {
      console.log(`[Server] Realtime Coaching Feed Backend running on port ${PORT}`);
      console.log(`[Server] CORS enabled for frontend at ${FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('[Server] Critical boot error:', error);
    throw error;
  }
};

startServer().catch((error) => {
  console.error('[Server] Fatal startup error during boot:', error);
  // Give Node.js streams 1 second to completely flush to the cloud log collector
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});
