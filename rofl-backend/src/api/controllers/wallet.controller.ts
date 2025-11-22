import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../../services/wallet.service';
import { setBalanceSecret, setTxSecret, BALANCE_SECRET_MESSAGE, TX_SECRET_MESSAGE } from '../../services/secret.service';
import { setBalance } from '../../services/balance.service';
import { verifyMessage, getAddress } from 'viem';
import { AppError } from '../middlewares/errorHandler';

// USDC token address
const USDC_TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Set balance secret for a wallet
   * POST /api/wallet/set-balance-secret
   */
  async setBalanceSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wallet = req.wallet;
      const { signature } = req.body;

      if (!wallet) {
        throw new AppError('Unauthorized', 401);
      }

      if (!signature) {
        throw new AppError('Signature is required', 400);
      }

      // Verify signature matches the expected message
      const isValid = await verifyMessage({
        address: wallet as `0x${string}`,
        message: BALANCE_SECRET_MESSAGE,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        throw new AppError('Invalid signature', 401);
      }

      await setBalanceSecret(wallet, signature);

      // TEST: Give new users 100 USDC
      await setBalance(wallet, USDC_TOKEN, '100');

      res.json({
        success: true,
        data: { message: 'Balance secret set successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set transaction secret for a wallet
   * POST /api/wallet/set-tx-secret
   */
  async setTxSecret(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wallet = req.wallet;
      const { signature } = req.body;

      if (!wallet) {
        throw new AppError('Unauthorized', 401);
      }

      if (!signature) {
        throw new AppError('Signature is required', 400);
      }

      // Verify signature matches the expected message
      const isValid = await verifyMessage({
        address: wallet as `0x${string}`,
        message: TX_SECRET_MESSAGE,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        throw new AppError('Invalid signature', 401);
      }

      await setTxSecret(wallet, signature);

      res.json({
        success: true,
        data: { message: 'Transaction secret set successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

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
