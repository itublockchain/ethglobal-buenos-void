import { Request, Response, NextFunction } from 'express';
import { hasBalanceSecret, hasTxSecret, hasAllSecrets } from '../../services/secret.service';

// Require balance secret to be set
export const requireBalanceSecret = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const wallet = req.wallet;

  if (!wallet) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const hasSecret = await hasBalanceSecret(wallet);
  if (!hasSecret) {
    res.status(403).json({
      success: false,
      error: 'Balance secret not set. Please call /api/wallet/set-balance-secret first.',
    });
    return;
  }

  next();
};

// Require transaction secret to be set
export const requireTxSecret = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const wallet = req.wallet;

  if (!wallet) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const hasSecret = await hasTxSecret(wallet);
  if (!hasSecret) {
    res.status(403).json({
      success: false,
      error: 'Transaction secret not set. Please call /api/wallet/set-tx-secret first.',
    });
    return;
  }

  next();
};

// Require both secrets to be set
export const requireAllSecrets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const wallet = req.wallet;

  if (!wallet) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const hasSecrets = await hasAllSecrets(wallet);
  if (!hasSecrets) {
    res.status(403).json({
      success: false,
      error: 'Secrets not set. Please set both balance and transaction secrets first.',
    });
    return;
  }

  next();
};
