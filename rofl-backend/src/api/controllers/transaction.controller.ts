import { Request, Response, NextFunction } from 'express';
import { getTransactionHistory } from '../../services/transaction.service';
import { TransactionHistoryItem } from '../../types/transaction.types';

export class TransactionController {
  /**
   * Get transaction history for authenticated wallet
   * GET /api/transactions
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wallet = req.wallet;

      if (!wallet) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const transactions = await getTransactionHistory(wallet);

      // Add type (sent/received) to each transaction
      const walletLower = wallet.toLowerCase();
      const history: TransactionHistoryItem[] = transactions.map(tx => ({
        ...tx,
        type: tx.sender.toLowerCase() === walletLower ? 'sent' : 'received'
      }));

      res.json({
        success: true,
        data: {
          transactions: history
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
