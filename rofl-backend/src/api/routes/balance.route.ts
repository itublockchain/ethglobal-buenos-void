import { Router } from 'express';
import { BalanceController } from '../controllers/balance.controller';
import { jwtAuth } from '../middlewares/jwtAuth';
import { requireBalanceSecret } from '../middlewares/requireSecrets';

const router = Router();

const balanceController = new BalanceController();

router.get('/', jwtAuth, requireBalanceSecret, (req, res, next) => balanceController.getBalances(req, res, next));

export default router;
