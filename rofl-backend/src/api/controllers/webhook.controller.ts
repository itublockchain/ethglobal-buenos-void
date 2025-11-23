import { Request, Response, NextFunction } from 'express';
import { verifyAlchemySignature, processAlchemyWebhook } from '../../services/webhook.service';

export class WebhookController {
  /**
   * Handle Alchemy webhook
   * POST /api/webhook/alchemy
   */
  async handleAlchemy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get raw body for signature verification
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        res.status(400).json({ success: false, error: 'Missing raw body' });
        return;
      }

      // Get signature from header
      const signature = req.headers['x-alchemy-signature'] as string;
      if (!signature) {
        res.status(401).json({ success: false, error: 'Missing signature' });
        return;
      }

      // Verify signature
      const isValid = verifyAlchemySignature(rawBody, signature);
      if (!isValid) {
        res.status(401).json({ success: false, error: 'Invalid signature' });
        return;
      }

      // Process the webhook
      await processAlchemyWebhook(req.body);

      res.json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      next(error);
    }
  }
}
