import { SMT } from '@zk-kit/smt';
import { keccak256, toBytes, concat } from 'viem';
import { TransactionProof } from '../types/transaction.types';
import { dbPut, dbGetAll } from './db.service';
import { getTxSecret } from './secret.service';

// In-memory SMT instance for transactions
let txSmt: SMT;

// Hash function for SMT (must return BigInt)
const hash = (childNodes: (string | bigint)[]): bigint => {
  const concatenated = childNodes.map(n => BigInt(n).toString(16).padStart(64, '0')).join('');
  return BigInt(keccak256(toBytes('0x' + concatenated)));
};

// Generate key for sender's transaction leaf
const generateSenderKey = (
  sender: string,
  receiver: string,
  token: string,
  timestamp: number,
  senderSecret: string
): bigint => {
  const combined = concat([
    toBytes(sender.toLowerCase()),
    toBytes(receiver.toLowerCase()),
    toBytes(token.toLowerCase()),
    toBytes(timestamp.toString()),
    toBytes(senderSecret),
  ]);
  return BigInt(keccak256(combined));
};

// Generate key for receiver's transaction leaf
const generateReceiverKey = (
  sender: string,
  receiver: string,
  token: string,
  timestamp: number,
  receiverSecret: string
): bigint => {
  const combined = concat([
    toBytes(sender.toLowerCase()),
    toBytes(receiver.toLowerCase()),
    toBytes(token.toLowerCase()),
    toBytes(timestamp.toString()),
    toBytes(receiverSecret),
  ]);
  return BigInt(keccak256(combined));
};

// Convert amount to BigInt (using 18 decimal precision)
const PRECISION = BigInt(10 ** 18);
const toBigIntAmount = (amount: string): bigint => {
  const num = parseFloat(amount);
  return BigInt(Math.floor(num * Number(PRECISION)));
};

// Initialize transaction service
export const initializeTransactionService = async (): Promise<void> => {
  txSmt = new SMT(hash, true);

  // Load existing transactions from RocksDB
  await loadTransactionsFromDatabase();

  console.log('Transaction service initialized with SMT');
  console.log('Transaction SMT Root:', getTxRoot());
};

// Load transactions from RocksDB and rebuild SMT
const loadTransactionsFromDatabase = async (): Promise<void> => {
  const entries = await dbGetAll('tx:');

  if (entries.length === 0) {
    console.log('No existing transaction data found');
    return;
  }

  console.log(`Loading ${entries.length} transaction entries from database...`);
  let loadedCount = 0;

  for (const entry of entries) {
    // Key format: tx:sender:receiver:token:timestamp:type (sender/receiver)
    const parts = entry.key.split(':');
    const sender = parts[1];
    const receiver = parts[2];
    const token = parts[3];
    const timestamp = parseInt(parts[4]);
    const type = parts[5]; // 'sender' or 'receiver'
    const amount = entry.value;

    const wallet = type === 'sender' ? sender : receiver;
    const userSecret = await getTxSecret(wallet);
    if (!userSecret) {
      console.warn(`Skipping transaction for ${wallet} - no secret found`);
      continue;
    }

    const key = type === 'sender'
      ? generateSenderKey(sender, receiver, token, timestamp, userSecret)
      : generateReceiverKey(sender, receiver, token, timestamp, userSecret);

    txSmt.add(key, toBigIntAmount(amount));
    loadedCount++;
  }

  console.log(`Loaded ${loadedCount} transaction entries from database`);
};

// Add transaction to SMT (creates 2 leaves: one for sender, one for receiver)
export const addTransaction = async (
  sender: string,
  receiver: string,
  token: string,
  amount: string
): Promise<{ senderKey: string; receiverKey: string; timestamp: number }> => {
  const timestamp = Date.now();

  // Get secrets for both parties
  const senderSecret = await getTxSecret(sender);
  const receiverSecret = await getTxSecret(receiver);

  if (!senderSecret) {
    throw new Error('Sender has not set transaction secret');
  }
  if (!receiverSecret) {
    throw new Error('Receiver has not set transaction secret');
  }

  // Generate keys
  const senderKey = generateSenderKey(sender, receiver, token, timestamp, senderSecret);
  const receiverKey = generateReceiverKey(sender, receiver, token, timestamp, receiverSecret);

  const amountBigInt = toBigIntAmount(amount);

  // Add both leaves to SMT
  txSmt.add(senderKey, amountBigInt);
  txSmt.add(receiverKey, amountBigInt);

  // Persist to RocksDB
  const senderDbKey = `tx:${sender.toLowerCase()}:${receiver.toLowerCase()}:${token.toLowerCase()}:${timestamp}:sender`;
  const receiverDbKey = `tx:${sender.toLowerCase()}:${receiver.toLowerCase()}:${token.toLowerCase()}:${timestamp}:receiver`;

  await dbPut(senderDbKey, amount);
  await dbPut(receiverDbKey, amount);

  return {
    senderKey: String(senderKey),
    receiverKey: String(receiverKey),
    timestamp
  };
};

// Get transaction proof for a user
export const getTxProof = async (
  sender: string,
  receiver: string,
  token: string,
  timestamp: number,
  forWallet: string
): Promise<TransactionProof> => {
  const userSecret = await getTxSecret(forWallet);
  if (!userSecret) {
    throw new Error('User has not set transaction secret');
  }

  const isSender = forWallet.toLowerCase() === sender.toLowerCase();
  const key = isSender
    ? generateSenderKey(sender, receiver, token, timestamp, userSecret)
    : generateReceiverKey(sender, receiver, token, timestamp, userSecret);

  const proof = txSmt.createProof(key);
  const value = txSmt.get(key);

  return {
    root: String(proof.root),
    siblings: proof.siblings.map(s => String(s)),
    key: String(key),
    value: value ? String(value) : '0',
  };
};

// Get current transaction SMT root
export const getTxRoot = (): string => {
  return String(txSmt.root);
};

// Verify a transaction proof
export const verifyTxProof = (proof: TransactionProof): boolean => {
  const key = BigInt(proof.key);
  const smtProof = txSmt.createProof(key);
  return smtProof.root === BigInt(proof.root);
};
