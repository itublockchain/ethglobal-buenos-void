import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import { initializeBalanceService } from './services/balance.service';
import { initializeTransactionService } from './services/transaction.service';
import { initializeDatabase, closeDatabase } from './services/db.service';
import { initializeRoflWallet } from './services/rofl.service';
import { hasTxSecret, setTxSecret, hasBalanceSecret, setBalanceSecret } from './services/secret.service';
import { createApiRouter } from './api';
import { errorHandler } from './api/middlewares/errorHandler';
import { env } from './config/env';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Raw body parser for webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

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

  // Initialize contract secrets if not set
  const contractAddress = env.VOID_CONTRACT_ADDRESS;
  const defaultSecret = '0x' + '0'.repeat(64);

  if (!(await hasBalanceSecret(contractAddress))) {
    await setBalanceSecret(contractAddress, defaultSecret);
    console.log(`Initialized balance secret for contract: ${contractAddress}`);
  }

  if (!(await hasTxSecret(contractAddress))) {
    await setTxSecret(contractAddress, defaultSecret);
    console.log(`Initialized tx secret for contract: ${contractAddress}`);
  }

  // Initialize ROFL wallet
  if (env.IS_TEE === 'true') {
    await initializeRoflWallet();
  }

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
