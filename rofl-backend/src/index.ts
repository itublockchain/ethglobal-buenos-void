import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { initializeBalanceService } from './services/balance.service';
import { initializeTransactionService } from './services/transaction.service';
import { initializeDatabase, closeDatabase } from './services/db.service';
import { createApiRouter } from './api';
import { errorHandler } from './api/middlewares/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api', createApiRouter());

// Error handler (must be last)
app.use(errorHandler);

// Initialize and start server
const start = async () => {
  // Initialize database first
  await initializeDatabase();

  // Initialize services (load from DB)
  await initializeBalanceService();
  await initializeTransactionService();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch(console.error);
