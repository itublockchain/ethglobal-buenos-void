import { Router } from 'express';
import { createRouter } from './routes';

export const createApiRouter = (): Router => {
    const router = Router();

    // API routes
    router.use('/', createRouter());

    return router;
};
