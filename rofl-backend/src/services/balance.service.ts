import { SMT } from '@zk-kit/smt';
import { keccak256, toBytes, toHex, concat } from 'viem';
import { Wallet } from 'ethers';
import { BalanceProof, BalanceEntry } from '../types/balance.types';

// In-memory SMT instance
let smt: SMT;
let secretKey: string;

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
const generateKey = (wallet: string, token: string): bigint => {
  const combined = concat([
    toBytes(wallet.toLowerCase()),
    toBytes(token.toLowerCase()),
    toBytes(secretKey),
  ]);
  return BigInt(keccak256(combined));
};

// Initialize the balance service
export const initializeBalanceService = async (): Promise<void> => {
  const privateKey = process.env.TEST_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TEST_PRIVATE_KEY is required for balance service');
  }

  // Generate secret key from signed message
  const wallet = new Wallet(privateKey);
  const message = 'Secret Signature for Void Wallet';
  const signature = await wallet.signMessage(message);
  secretKey = keccak256(toBytes(signature));
  console.log('Balance service secret key generated');

  // Initialize SMT with keccak256 hash
  smt = new SMT(hash, true);

  // Add mock data
  initializeMockData();

  console.log('Balance service initialized with SMT');
  console.log('SMT Root:', getRoot());
};

// Initialize mock data for cold start
const initializeMockData = (): void => {
  // Mock wallets
  const wallets = [
    '0x46e11Dd000D06baFaF401998D5E0B8F15d338126',
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  ];

  // Mock tokens (Base Sepolia)
  const tokens = [
    '0x0000000000000000000000000000000000000000', // Native token (ETH)
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
  ];

  // Set initial balances (human-readable decimals)
  const mockBalances: BalanceEntry[] = [
    { wallet: wallets[0], token: tokens[0], balance: '1' }, // 1 ETH
    { wallet: wallets[0], token: tokens[1], balance: '1000' }, // 1000 USDC
    { wallet: wallets[1], token: tokens[0], balance: '5' }, // 5 ETH
    { wallet: wallets[1], token: tokens[1], balance: '2500' }, // 2500 USDC
    { wallet: wallets[2], token: tokens[0], balance: '10' }, // 10 ETH
    { wallet: wallets[2], token: tokens[1], balance: '5000' }, // 5000 USDC
  ];

  for (const entry of mockBalances) {
    setBalance(entry.wallet, entry.token, entry.balance);
  }

  console.log(`Mock data initialized: ${mockBalances.length} balance entries`);
};

// Get balance for wallet + token
export const getBalance = (wallet: string, token: string): string => {
  const key = generateKey(wallet, token);
  const value = smt.get(key);
  return value ? fromBigIntBalance(BigInt(String(value))) : '0';
};

// Set balance for wallet + token
export const setBalance = (wallet: string, token: string, balance: string): void => {
  const key = generateKey(wallet, token);
  smt.add(key, toBigIntBalance(balance));
};

// Update balance (for transfers)
export const updateBalance = (wallet: string, token: string, newBalance: string): void => {
  const key = generateKey(wallet, token);
  const exists = smt.get(key);

  if (exists) {
    smt.update(key, toBigIntBalance(newBalance));
  } else {
    smt.add(key, toBigIntBalance(newBalance));
  }
};

// Get merkle proof for balance
export const getProof = (wallet: string, token: string): BalanceProof => {
  const key = generateKey(wallet, token);
  const proof = smt.createProof(key);

  return {
    root: String(proof.root),
    siblings: proof.siblings.map(s => String(s)),
    key: String(key),
    value: getBalance(wallet, token),
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
  getBalance(wallet: string, token: string): string {
    return getBalance(wallet, token);
  }

  setBalance(wallet: string, token: string, balance: string): void {
    setBalance(wallet, token, balance);
  }

  updateBalance(wallet: string, token: string, newBalance: string): void {
    updateBalance(wallet, token, newBalance);
  }

  getProof(wallet: string, token: string): BalanceProof {
    return getProof(wallet, token);
  }

  getRoot(): string {
    return getRoot();
  }

  verifyProof(proof: BalanceProof): boolean {
    return verifyProof(proof);
  }
}
