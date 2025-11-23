import { Router, Request, Response, NextFunction } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { WalletService } from '../../services/wallet.service';
import { withdraw } from '../../services/rofl.service';
import { getBalance, updateBalance } from '../../services/balance.service';
import { addTransaction } from '../../services/transaction.service';
import { jwtAuth } from '../middlewares/jwtAuth';
import { requireAllSecrets } from '../middlewares/requireSecrets';
import { env } from '../../config/env';

const router = Router();

const walletService = new WalletService();
const walletController = new WalletController(walletService);

// Secret management (requires JWT)
router.post('/set-balance-secret', jwtAuth, (req, res, next) => walletController.setBalanceSecret(req, res, next));
router.post('/set-tx-secret', jwtAuth, (req, res, next) => walletController.setTxSecret(req, res, next));

// Transfer (requires JWT and all secrets)
router.post('/transfer', jwtAuth, requireAllSecrets, (req, res, next) => walletController.transfer(req, res, next));

// Withdraw from VOID contract on Base Sepolia
router.post('/withdraw', jwtAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, token } = req.query;
    const to = req.wallet;

    if (!to) {
      return res.status(401).json({ success: false, error: 'Wallet address not found in token' });
    }

    if (!amount || typeof amount !== 'string') {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Token address is required' });
    }

    // Check user balance
    const currentBalance = await getBalance(to, token);
    const currentBalanceNum = parseFloat(currentBalance);
    const withdrawAmount = parseFloat(amount);

    if (currentBalanceNum < withdrawAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Execute withdraw on-chain
    const txHash = await withdraw(to, amount, token);

    // Update user balance
    const newBalance = (currentBalanceNum - withdrawAmount).toString();
    await updateBalance(to, token, newBalance);

    // Add to transaction history
    await addTransaction(to, env.VOID_CONTRACT_ADDRESS, token, amount);

    res.json({ success: true, data: { txHash } });
  } catch (error) {
    next(error);
  }
});

export default router;
