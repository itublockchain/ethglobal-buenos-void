import { verifyMessage as viemVerifyMessage } from 'viem';

interface VerifySignatureParams {
  walletAddress: string;
  signature: string;
  message: string;
}

interface VerifySignatureResult {
  isValid: boolean;
  error?: string;
}

export async function verifyWalletSignature({
  walletAddress,
  signature,
  message,
}: VerifySignatureParams): Promise<VerifySignatureResult> {
  try {
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return { isValid: false, error: 'Invalid wallet address format' };
    }

    // Verify signature
    const isValid = await viemVerifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return { isValid: false, error: 'Invalid signature' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Signature verification failed' };
  }
}
