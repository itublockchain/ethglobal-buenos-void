import { z } from 'zod';
import { verifyWalletSignature } from '../utils/wallet.util';
import { TransferRequest, TransferResult } from '../types/wallet.types';
import { AppError } from '../api/middlewares/errorHandler';
import { getBalance, updateBalance, getRoot } from './balance.service';
import { addTransaction, getTxRoot } from './transaction.service';
import { hasAllSecrets } from './secret.service';

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

    // Check both parties have set their secrets
    const senderHasSecrets = await hasAllSecrets(sendTransaction.from);
    const receiverHasSecrets = await hasAllSecrets(sendTransaction.to);

    if (!senderHasSecrets) {
      throw new AppError('Sender has not set all required secrets', 400);
    }
    if (!receiverHasSecrets) {
      throw new AppError('Receiver has not set all required secrets', 400);
    }

    // Check sender balance (using human-readable decimals)
    const senderBalance = await getBalance(sendTransaction.from, sendTransaction.token);
    const amount = parseFloat(sendTransaction.amount);
    const currentBalance = parseFloat(senderBalance);

    if (currentBalance < amount) {
      throw new AppError('Insufficient balance', 400);
    }

    // Execute transfer
    const newSenderBalance = (currentBalance - amount).toString();
    const receiverBalance = await getBalance(sendTransaction.to, sendTransaction.token);
    const newReceiverBalance = (parseFloat(receiverBalance) + amount).toString();

    // Update balances in Balance SMT
    await updateBalance(sendTransaction.from, sendTransaction.token, newSenderBalance);
    await updateBalance(sendTransaction.to, sendTransaction.token, newReceiverBalance);

    // Add transaction to Transaction SMT (creates 2 leaves)
    await addTransaction(
      sendTransaction.from,
      sendTransaction.to,
      sendTransaction.token,
      sendTransaction.amount
    );

    // Generate tx hash from balance SMT root
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
