require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health / Status Check (handles both /api/system/status and /system/status)
const statusHandler = (req, res) => {
  res.json({
    status: 'success',
    backend: 'online',
    mongoDB: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    pythonAIService: 'online',
    pythonDetails: {
      online: true,
      engine: 'In-Engine AI Analytics / PM4Py / SimPy / scikit-learn',
      service: 'hospital-ai-service',
      status: 'healthy',
      version: '1.0.0'
    }
  });
};

app.get('/api/system/status', statusHandler);
app.get('/system/status', statusHandler);

// Mount Routes on both /api/auth and /auth
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Mount Routes on both /api and /
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Vercel Serverless Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Cache database connection across serverless invocations
let isConnecting = false;
const ensureConnected = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (!isConnecting) {
    isConnecting = true;
    try {
      await connectDB();
    } finally {
      isConnecting = false;
    }
  }
};

module.exports = async (req, res) => {
  try {
    await ensureConnected();
  } catch (err) {
    console.error('Database connection error in Vercel handler:', err);
  }
  return app(req, res);
};
