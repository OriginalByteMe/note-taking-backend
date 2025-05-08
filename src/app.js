import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize database connections
import { initializeConnections } from './config/index.js';

// Import routes
import healthRouter from './routes/health.js';
import noteRouter from './routes/note.js';
import userRouter from './routes/user.js';

const app = express();

// Initialize database connections on app startup
initializeConnections().catch(err => {
  console.error('Failed to initialize database connections:', err);
  process.exit(1);
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/health', healthRouter);
app.use('/notes', noteRouter);
app.use('/users', userRouter);

// 404 handler - for routes that don't exist
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use(errorHandler);

export default app;
