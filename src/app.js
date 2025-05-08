import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';

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
app.use(express.static(path.join(import.meta.dirname, 'public')));

app.use('/health', healthRouter);
app.use('/notes', noteRouter);
app.use('/users', userRouter);

export default app;
