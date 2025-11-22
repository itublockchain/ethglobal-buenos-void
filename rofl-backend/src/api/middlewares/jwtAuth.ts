import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';

const authService = new AuthService();

declare global {
  namespace Express {
    interface Request {
      wallet?: string;
    }
  }
}

export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);

    req.wallet = payload.wallet;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
