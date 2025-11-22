import { SMT } from '@zk-kit/smt';
import { keccak256, toBytes, concat } from 'viem';
import { BalanceProof } from '../types/balance.types';
import { dbGet, dbPut, dbGetAll } from './db.service';
import { getBalanceSecret } from './secret.service';

// In-memory SMT instance
let smt: SMT;

// Precision factor for storing decimals as BigInt (10^18)
const PRECISION = BigInt(10 ** 18);

// Convert decimal string to BigInt for storage
const toBigIntBalance = (balance: string): bigint => {
  const num = parseFloat(balance);
  return BigInt(Math.floor(num * Number(PRECISION)));
};

// Convert BigInt back to decimal string
const fromBigIntBalance = (value: bigint): string => {
  const num = Number(value) / Number(PRECISION);
  return num.toString();
};

// Hash function for SMT (must return BigInt)
const hash = (childNodes: (string | bigint)[]): bigint => {
  const concatenated = childNodes.map(n => BigInt(n).toString(16).padStart(64, '0')).join('');
  return BigInt(keccak256(toBytes('0x' + concatenated)));
};

// Generate key for SMT leaf (returns BigInt)
const generateKey = (wallet: string, token: string, userSecret: string): bigint => {
  const combined = concat([
    toBytes(wallet.toLowerCase()),
    toBytes(token.toLowerCase()),
    toBytes(userSecret),
  ]);
  return BigInt(keccak256(combined));
};

// Initialize the balance service
export const initializeBalanceService = async (): Promise<void> => {
  // Initialize SMT with keccak256 hash
  smt = new SMT(hash, true);

  // Load existing data from RocksDB
  await loadFromDatabase();

  console.log('Balance service initialized with SMT');
  console.log('SMT Root:', getRoot());
};

// Load balances from RocksDB and rebuild SMT
const loadFromDatabase = async (): Promise<void> => {
  const entries = await dbGetAll('balance:');

  if (entries.length === 0) {
    console.log('No existing balance data found, starting with empty SMT');
    return;
  }

  console.log(`Loading ${entries.length} balance entries from database...`);
  let loadedCount = 0;

  for (const entry of entries) {
    // Key format: balance:wallet:token
    const parts = entry.key.split(':');
    const walletAddr = parts[1];
    const tokenAddr = parts[2];
    const balance = entry.value;

    // Get user's secret to generate SMT key
    const userSecret = await getBalanceSecret(walletAddr);
    if (!userSecret) {
      console.warn(`Skipping balance for ${walletAddr} - no secret found`);
      continue;
    }

    const key = generateKey(walletAddr, tokenAddr, userSecret);
    smt.add(key, toBigIntBalance(balance));
    loadedCount++;
  }

  console.log(`Loaded ${loadedCount} balance entries from database`);
};

// Get balance for wallet + token
export const getBalance = async (wallet: string, token: string): Promise<string> => {
  const userSecret = await getBalanceSecret(wallet);
  if (!userSecret) {
    return '0';
  }

  const key = generateKey(wallet, token, userSecret);
  const value = smt.get(key);
  return value ? fromBigIntBalance(BigInt(String(value))) : '0';
};

// Set balance for wallet + token
export const setBalance = async (wallet: string, token: string, balance: string): Promise<void> => {
  const userSecret = await getBalanceSecret(wallet);
  if (!userSecret) {
    throw new Error('User has not set balance secret');
  }

  const key = generateKey(wallet, token, userSecret);
  smt.add(key, toBigIntBalance(balance));

  // Persist to RocksDB
  const dbKey = `balance:${wallet.toLowerCase()}:${token.toLowerCase()}`;
  await dbPut(dbKey, balance);
};

// Update balance (for transfers)
export const updateBalance = async (wallet: string, token: string, newBalance: string): Promise<void> => {
  const userSecret = await getBalanceSecret(wallet);
  if (!userSecret) {
    throw new Error('User has not set balance secret');
  }

  const key = generateKey(wallet, token, userSecret);
  const exists = smt.get(key);

  if (exists) {
    smt.update(key, toBigIntBalance(newBalance));
  } else {
    smt.add(key, toBigIntBalance(newBalance));
  }

  // Persist to RocksDB
  const dbKey = `balance:${wallet.toLowerCase()}:${token.toLowerCase()}`;
  await dbPut(dbKey, newBalance);
};

// Get merkle proof for balance
export const getProof = async (wallet: string, token: string): Promise<BalanceProof> => {
  const userSecret = await getBalanceSecret(wallet);
  if (!userSecret) {
    throw new Error('User has not set balance secret');
  }

  const key = generateKey(wallet, token, userSecret);
  const proof = smt.createProof(key);
  const balance = await getBalance(wallet, token);

  return {
    root: String(proof.root),
    siblings: proof.siblings.map(s => String(s)),
    key: String(key),
    value: balance,
  };
};

// Get current SMT root
export const getRoot = (): string => {
  return String(smt.root);
};

// Verify a proof
export const verifyProof = (proof: BalanceProof): boolean => {
  const key = BigInt(proof.key);
  const smtProof = smt.createProof(key);
  return smtProof.root === BigInt(proof.root);
};

export class BalanceService {
  async getBalance(wallet: string, token: string): Promise<string> {
    return getBalance(wallet, token);
  }

  async setBalance(wallet: string, token: string, balance: string): Promise<void> {
    await setBalance(wallet, token, balance);
  }

  async updateBalance(wallet: string, token: string, newBalance: string): Promise<void> {
    await updateBalance(wallet, token, newBalance);
  }

  async getProof(wallet: string, token: string): Promise<BalanceProof> {
    return getProof(wallet, token);
  }

  getRoot(): string {
    return getRoot();
  }

  verifyProof(proof: BalanceProof): boolean {
    return verifyProof(proof);
  }
}
