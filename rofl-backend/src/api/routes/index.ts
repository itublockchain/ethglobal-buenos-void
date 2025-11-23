import { Router } from 'express';
import authRouter from './auth.route';
import walletRouter from './wallet.route';
import balanceRouter from './balance.route';
import transactionRouter from './transaction.route';
import webhookRouter from './webhook.route';
import roflRouter from './rofl.route';

export const createRouter = (): Router => {
    const router = Router();

    router.use('/auth', authRouter);
    router.use('/wallet', walletRouter);
    router.use('/balance', balanceRouter);
    router.use('/transactions', transactionRouter);
    router.use('/webhook', webhookRouter);
    router.use('/rofl', roflRouter);

    return router;
};
