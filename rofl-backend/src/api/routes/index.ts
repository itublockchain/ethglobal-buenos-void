import { Router } from 'express';
import authRouter from './auth.route';
import walletRouter from './wallet.route';
import balanceRouter from './balance.route';
import transactionRouter from './transaction.route';

export const createRouter = (): Router => {
    const router = Router();

    router.use('/auth', authRouter);
    router.use('/wallet', walletRouter);
    router.use('/balance', balanceRouter);
    router.use('/transactions', transactionRouter);

    return router;
};
