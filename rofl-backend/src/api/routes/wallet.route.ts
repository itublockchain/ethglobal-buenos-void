import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { WalletService } from '../../services/wallet.service';
import { jwtAuth } from '../middlewares/jwtAuth';

const router = Router();

const walletService = new WalletService();
const walletController = new WalletController(walletService);

router.post('/transfer', jwtAuth, (req, res, next) => walletController.transfer(req, res, next));

export default router;
