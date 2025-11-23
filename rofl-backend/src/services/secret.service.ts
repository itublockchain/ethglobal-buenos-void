import { keccak256, toBytes } from 'viem';
import { dbGet, dbPut } from './db.service';

const BALANCE_SECRET_PREFIX = 'secret:balance:';
const TX_SECRET_PREFIX = 'secret:tx:';

export const BALANCE_SECRET_MESSAGE = 'Void Wallet Balances Secret';
export const TX_SECRET_MESSAGE = 'Void Wallet Transactions Secret';

// Derive secret from signature
const deriveSecret = (signature: string): string => {
  return keccak256(toBytes(signature).slice(0, 64));
};

// Balance Secret
export const getBalanceSecret = async (wallet: string): Promise<string | null> => {
  const key = `${BALANCE_SECRET_PREFIX}${wallet.toLowerCase()}`;
  return await dbGet(key);
};

export const setBalanceSecret = async (wallet: string, signature: string): Promise<string> => {
  const existing = await getBalanceSecret(wallet);
  if (existing) {
    throw new Error('Balance secret already set');
  }

  const secret = deriveSecret(signature);
  const key = `${BALANCE_SECRET_PREFIX}${wallet.toLowerCase()}`;
  await dbPut(key, secret);
  return secret;
};

export const hasBalanceSecret = async (wallet: string): Promise<boolean> => {
  const secret = await getBalanceSecret(wallet);
  return secret !== null;
};

// Transaction Secret
export const getTxSecret = async (wallet: string): Promise<string | null> => {
  const key = `${TX_SECRET_PREFIX}${wallet.toLowerCase()}`;
  return await dbGet(key);
};

export const setTxSecret = async (wallet: string, signature: string): Promise<string> => {
  const existing = await getTxSecret(wallet);
  if (existing) {
    throw new Error('Transaction secret already set');
  }

  const secret = deriveSecret(signature);
  const key = `${TX_SECRET_PREFIX}${wallet.toLowerCase()}`;
  await dbPut(key, secret);
  return secret;
};

export const hasTxSecret = async (wallet: string): Promise<boolean> => {
  const secret = await getTxSecret(wallet);
  return secret !== null;
};

// Check if user has both secrets
export const hasAllSecrets = async (wallet: string): Promise<boolean> => {
  const [hasBalance, hasTx] = await Promise.all([
    hasBalanceSecret(wallet),
    hasTxSecret(wallet)
  ]);
  return hasBalance && hasTx;
};
