import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { jwtAuth } from '../middlewares/jwtAuth';
import { requireTxSecret } from '../middlewares/requireSecrets';

const router = Router();

const transactionController = new TransactionController();

// Get transaction history (requires JWT and tx secret)
router.get('/', jwtAuth, requireTxSecret, (req, res, next) => transactionController.getHistory(req, res, next));

export default router;
