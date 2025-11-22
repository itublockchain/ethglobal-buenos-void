import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Get message to sign
   * GET /api/auth/message?address=0x...
   */
  getMessage(req: Request, res: Response, next: NextFunction): void {
    try {
      const { address } = req.query;

      if (!address || typeof address !== 'string') {
        res.status(400).json({ success: false, error: 'Address is required' });
        return;
      }

      const message = this.authService.generateMessage(address);

      res.json({
        success: true,
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login with signed message
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.authService.login(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wallet = req.wallet;

      if (!wallet) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await this.authService.getMe(wallet);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
