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

// Root health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    name: 'CN - Hospital Intelligence System API',
    status: 'online',
    version: '1.0.0',
    docs: '/api/system/status'
  });
});

// Serve static frontend SPA
const frontendDist = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(frontendDist, 'index.html'));
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
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Hospital Accreditation Backend running on port ${PORT}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`=======================================================`);
    });
    connectDB().catch(err => {
      console.error(`[MongoDB Init Error] ${err.message}`);
    });

    // Keep-alive heartbeat: ping Python AI and backend every 4 minutes so Render never sleeps them
    const pyConnector = require('./services/pyServiceConnector');
    const axios = require('axios');
    const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000;
    
    // Initial health check on boot
    setTimeout(async () => {
      try {
        const pyHealth = await pyConnector.checkHealth();
        console.log(`[Startup Check] Python AI Status: ${pyHealth.online ? 'ONLINE ✅' : 'OFFLINE ⚠️'}`);
      } catch (err) {
        console.warn(`[Startup Check] Python AI check error: ${err.message}`);
      }
    }, 2000);

    setInterval(async () => {
      try {
        const pyHealth = await pyConnector.checkHealth();
        if (pyHealth.online) {
          console.log(`[Keep-Alive] Python AI Service is active (200 OK)`);
        }
      } catch (err) {
        console.warn(`[Keep-Alive] Python AI ping: ${err.message}`);
      }

      // Self-ping to prevent backend spin-down on Render
      const selfUrl = process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'https://cn-backend-5pnj.onrender.com' : null);
      if (selfUrl) {
        try {
          await axios.get(`${selfUrl}/api/health`, { timeout: 15000 });
        } catch (err) {
          // ignore
        }
      }
    }, KEEP_ALIVE_INTERVAL);

  } catch (error) {
    console.error(`Failed to start backend server: ${error.message}`);
  }
};

startServer();
