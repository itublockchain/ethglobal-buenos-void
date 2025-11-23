import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

const webhookController = new WebhookController();

// Alchemy webhook endpoint
router.post('/alchemy', (req, res, next) => webhookController.handleAlchemy(req, res, next));

export default router;
