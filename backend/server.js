/**
 * MentriQIQ - Main Server Entry Point
 * Sets up Express app, middleware, routes, and DB connection.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mentriqiq';

let mongoConnectionPromise = null;

const connectDB = async () => {
  if (process.env.VERCEL && !process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    })
      .then((connection) => {
        console.log('MongoDB connected');
        return connection;
      })
      .catch((err) => {
        mongoConnectionPromise = null;
        throw err;
      });
  }

  return mongoConnectionPromise;
};

// Security middleware
app.use(helmet());

// Rate limiting: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check does not require MongoDB.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MentriQIQ API is running' });
});

// Connect lazily so the Express app can be imported by Vercel serverless functions.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    res.status(503).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (require.main === module) {
  connectDB()
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(`MentriQIQ server running on port ${PORT}`);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a free port in backend/.env.`);
          process.exit(1);
        }

        console.error('Server start error:', err.message);
        process.exit(1);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
    });
}

module.exports = app;
