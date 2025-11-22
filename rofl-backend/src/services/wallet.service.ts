import { z } from 'zod';
import { verifyWalletSignature } from '../utils/wallet.util';
import { TransferRequest, TransferResult } from '../types/wallet.types';
import { AppError } from '../api/middlewares/errorHandler';
import { getBalance, updateBalance, getRoot } from './balance.service';

const transferSchema = z.object({
  sendTransaction: z.object({
    from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid from address'),
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid to address'),
    token: z.string().min(1, 'Token is required'),
    amount: z.string().min(1, 'Amount is required'),
  }),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature format'),
});

export class WalletService {
  async transfer(body: TransferRequest): Promise<TransferResult> {
    // Validate request
    const validated = transferSchema.parse(body);
    const { sendTransaction, signature } = validated;

    // Verify signature
    const message = JSON.stringify(sendTransaction);
    const result = await verifyWalletSignature({
      walletAddress: sendTransaction.from,
      signature,
      message,
    });

    if (!result.isValid) {
      throw new AppError(result.error || 'Invalid signature', 401);
    }

    // Check sender balance (using human-readable decimals)
    const senderBalance = getBalance(sendTransaction.from, sendTransaction.token);
    const amount = parseFloat(sendTransaction.amount);
    const currentBalance = parseFloat(senderBalance);
    
    if (currentBalance < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    // Execute transfer
    const newSenderBalance = (currentBalance - amount).toString();
    const receiverBalance = getBalance(sendTransaction.to, sendTransaction.token);
    const newReceiverBalance = (parseFloat(receiverBalance) + amount).toString();

    // Update balances in SMT
    updateBalance(sendTransaction.from, sendTransaction.token, newSenderBalance);
    updateBalance(sendTransaction.to, sendTransaction.token, newReceiverBalance);

    // Generate tx hash from new SMT root
    const txHash = getRoot();

    return {
      txHash,
      from: sendTransaction.from,
      to: sendTransaction.to,
      token: sendTransaction.token,
      amount: sendTransaction.amount,
    };
  }
}
