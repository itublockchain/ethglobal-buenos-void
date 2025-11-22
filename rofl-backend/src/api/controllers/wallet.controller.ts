import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../../services/wallet.service';

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Transfer tokens between wallets
   * POST /api/wallet/transfer
   */
  async transfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.walletService.transfer(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
