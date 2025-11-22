import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { WalletService } from '../../services/wallet.service';
import { jwtAuth } from '../middlewares/jwtAuth';
import { requireAllSecrets } from '../middlewares/requireSecrets';

const router = Router();

const walletService = new WalletService();
const walletController = new WalletController(walletService);

// Secret management (no JWT required - user proves ownership via signature)
router.post('/set-balance-secret', (req, res, next) => walletController.setBalanceSecret(req, res, next));
router.post('/set-tx-secret', (req, res, next) => walletController.setTxSecret(req, res, next));

// Transfer (requires JWT and all secrets)
router.post('/transfer', jwtAuth, requireAllSecrets, (req, res, next) => walletController.transfer(req, res, next));

export default router;
