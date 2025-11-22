import { Request, Response, NextFunction } from 'express';
import { getBalance } from '../../services/balance.service';

// Known tokens
const TOKENS = [
  '0x0000000000000000000000000000000000000000', // Native token (ETH)
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
];

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

      const balances = await Promise.all(
        TOKENS.map(async (token) => ({
          token,
          balance: await getBalance(wallet, token),
        }))
      );

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
