require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && !req.path.includes('/health')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../frontend/dist');

// Static Frontend Serving in Production / Docker (Hugging Face)
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'CN - Hospital Intelligence System API',
      status: 'online',
      version: '1.0.0',
      docs: '/api/system/status'
    });
  });
}

// Global Error Handler (Section 21: explicit error state, no silent fallbacks)
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Hospital Accreditation Backend running on port ${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`=======================================================`);
    });

    // 24/7 Keep-alive heartbeat: ping Python AI and self-ping every 3 minutes so Render never sleeps
    const pyConnector = require('./services/pyServiceConnector');
    const axios = require('axios');
    const KEEP_ALIVE_INTERVAL = 3 * 60 * 1000;

    setInterval(async () => {
      try {
        await pyConnector.checkHealth();
      } catch (err) {
        // keep alive
      }

      const selfUrl = process.env.RENDER_EXTERNAL_URL;
      if (selfUrl) {
        try {
          await axios.get(`${selfUrl}/api/system/status`, { timeout: 15000 });
        } catch (err) {
          // keep alive
        }
      }
    }, KEEP_ALIVE_INTERVAL);

  } catch (error) {
    console.error(`Failed to start backend server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
