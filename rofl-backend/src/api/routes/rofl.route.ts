import { Router, Request, Response, NextFunction } from 'express';
import { getRoflWalletAddress } from '../../services/rofl.service';

const router = Router();

// GET /api/rofl/get-wallet-address
router.get('/get-wallet-address', (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = getRoflWalletAddress();
    res.json({ success: true, data: { address } });
  } catch (error) {
    next(error);
  }
});

export default router;
