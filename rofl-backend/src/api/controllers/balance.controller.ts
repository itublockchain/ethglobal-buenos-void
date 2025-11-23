import { Request, Response, NextFunction } from 'express';
import { getAllBalances } from '../../services/balance.service';

export class BalanceController {
  /**
   * Get balances for authenticated wallet
   * GET /api/balance
   */
  async getBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wallet = req.wallet;

      if (!wallet) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const balances = await getAllBalances(wallet);

      res.json({
        success: true,
        data: {
          wallet,
          balances,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
