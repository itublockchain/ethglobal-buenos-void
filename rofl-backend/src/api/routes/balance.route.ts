import { Router } from 'express';
import { BalanceController } from '../controllers/balance.controller';
import { jwtAuth } from '../middlewares/jwtAuth';

const router = Router();

const balanceController = new BalanceController();

router.get('/', jwtAuth, (req, res, next) => balanceController.getBalances(req, res, next));

export default router;
