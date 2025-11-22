import jwt from 'jsonwebtoken';
import { getAddress, verifyMessage } from 'viem';
import { LoginRequest, LoginResponse, JwtPayload, MeResponse } from '../types/auth.types';
import { AppError } from '../api/middlewares/errorHandler';
import { hasBalanceSecret, hasTxSecret } from './secret.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

export class AuthService {
  generateMessage(address: string): string {
    const checksummedAddress = getAddress(address);
    const timestamp = Date.now();
    return `Login Void Wallet Timestamp:${timestamp}`;
  }

  async login(request: LoginRequest): Promise<LoginResponse> {
    const { message, signature, address } = request;

    try {
      const checksummedAddress = getAddress(address);

      const isValid = await verifyMessage({
        address: checksummedAddress,
        message,
        signature: signature as `0x${string}`,
      });

      if (!isValid) {
        throw new AppError('Invalid signature', 401);
      }

      // Generate JWT
      const payload: JwtPayload = { wallet: checksummedAddress };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      return { token, wallet: checksummedAddress };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.log('error', error);
      throw new AppError('Signature verification failed', 401);
    }
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      return decoded;
    } catch (error) {
      throw new AppError('Invalid or expired token', 401);
    }
  }

  async getMe(wallet: string): Promise<MeResponse> {
    const required_secrets: string[] = [];

    const hasBalance = await hasBalanceSecret(wallet);
    const hasTx = await hasTxSecret(wallet);

    if (!hasBalance) {
      required_secrets.push('balance');
    }
    if (!hasTx) {
      required_secrets.push('transaction');
    }

    return { wallet, required_secrets };
  }
}
