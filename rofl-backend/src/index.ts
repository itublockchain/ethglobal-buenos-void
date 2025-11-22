import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { initializeBalanceService } from './services/balance.service';
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
  await initializeBalanceService();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch(console.error);
