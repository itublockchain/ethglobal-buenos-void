import { SMT } from '@cedoor/smt';
import { keccak256, toBytes, concat } from 'viem';
import { TransactionProof, TransactionEntry } from '../types/transaction.types';
import { dbGet, dbPut, dbGetAll } from './db.service';
import { getTxSecret } from './secret.service';

// In-memory SMT instance for transactions
let txSmt: SMT;

// Normalize hex string (strip 0x, pad to 64 chars)
const normalize = (hex: string): string => {
  const h = hex.replace(/^0x/, '');
  return h.padStart(64, '0');
};

// Hash function for SMT (must return hex string)
const hash = (childNodes: (string | bigint)[]): string => {
  const concatenated = childNodes.map(n => normalize(String(n))).join('');
  return normalize(keccak256(toBytes('0x' + concatenated)));
};

// Generate key for transaction leaf (no timestamp - same key for same pair)
const generateTxKey = (
  sender: string,
  receiver: string,
  token: string,
  userSecret: string
): string => {
  const combined = concat([
    toBytes(sender.toLowerCase()),
    toBytes(receiver.toLowerCase()),
    toBytes(token.toLowerCase()),
    toBytes(userSecret),
  ]);
  return normalize(keccak256(combined));
};

// Hash transaction array for SMT value
const hashTransactions = (transactions: TransactionEntry[]): string => {
  const data = JSON.stringify(transactions);
  return normalize(keccak256(toBytes(data)));
};

// Initialize transaction service
export const initializeTransactionService = async (): Promise<void> => {
  txSmt = new SMT(hash);

  // Load existing transactions from RocksDB
  await loadTransactionsFromDatabase();

  console.log('Transaction service initialized with SMT');
  console.log('Transaction SMT Root:', getTxRoot());
};

// Load transactions from RocksDB and rebuild SMT
const loadTransactionsFromDatabase = async (): Promise<void> => {
  const entries = await dbGetAll('txdata:');

  if (entries.length === 0) {
    console.log('No existing transaction data found');
    return;
  }

  console.log(`Loading transaction data from database...`);
  let loadedCount = 0;

  for (const entry of entries) {
    // Key format: txdata:sender:receiver:token:type
    const parts = entry.key.split(':');
    const sender = parts[1];
    const receiver = parts[2];
    const token = parts[3];
    const type = parts[4]; // 'sender' or 'receiver'

    const wallet = type === 'sender' ? sender : receiver;
    const userSecret = await getTxSecret(wallet);
    if (!userSecret) {
      console.warn(`Skipping transaction for ${wallet} - no secret found`);
      continue;
    }

    const transactions: TransactionEntry[] = JSON.parse(entry.value);
    const key = generateTxKey(sender, receiver, token, userSecret);
    const valueHash = hashTransactions(transactions);

    txSmt.add(key, valueHash);
    loadedCount++;
  }

  console.log(`Loaded ${loadedCount} transaction entries from database`);
};

// Add transaction to SMT (updates existing array or creates new)
export const addTransaction = async (
  sender: string,
  receiver: string,
  token: string,
  amount: string
): Promise<{ timestamp: number }> => {
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

  const newTx: TransactionEntry = {
    sender,
    receiver,
    token,
    amount,
    timestamp
  };

  // Update sender's leaf
  await updateTxLeaf(sender, receiver, token, 'sender', senderSecret, newTx);

  // Update receiver's leaf
  await updateTxLeaf(sender, receiver, token, 'receiver', receiverSecret, newTx);

  return { timestamp };
};

// Update a transaction leaf (add to array, update SMT)
const updateTxLeaf = async (
  sender: string,
  receiver: string,
  token: string,
  type: 'sender' | 'receiver',
  userSecret: string,
  newTx: TransactionEntry
): Promise<void> => {
  const dbKey = `txdata:${sender.toLowerCase()}:${receiver.toLowerCase()}:${token.toLowerCase()}:${type}`;

  // Get existing transactions
  const existing = await dbGet(dbKey);
  const transactions: TransactionEntry[] = existing ? JSON.parse(existing) : [];

  // Add new transaction
  transactions.push(newTx);

  // Generate SMT key and value hash
  const smtKey = generateTxKey(sender, receiver, token, userSecret);
  const valueHash = hashTransactions(transactions);

  // Update or add to SMT
  const existingValue = txSmt.get(smtKey);
  if (existingValue) {
    txSmt.update(smtKey, valueHash);
  } else {
    txSmt.add(smtKey, valueHash);
  }

  // Persist to RocksDB
  await dbPut(dbKey, JSON.stringify(transactions));
};

// Get transaction history for a wallet
export const getTransactionHistory = async (wallet: string): Promise<TransactionEntry[]> => {
  const allEntries = await dbGetAll('txdata:');
  const walletLower = wallet.toLowerCase();
  const history: TransactionEntry[] = [];

  for (const entry of allEntries) {
    const parts = entry.key.split(':');
    const sender = parts[1];
    const receiver = parts[2];
    const type = parts[4];

    // Check if this wallet is involved
    const isSender = sender === walletLower && type === 'sender';
    const isReceiver = receiver === walletLower && type === 'receiver';

    if (isSender || isReceiver) {
      const transactions: TransactionEntry[] = JSON.parse(entry.value);
      history.push(...transactions);
    }
  }

  // Sort by timestamp (newest first)
  history.sort((a, b) => b.timestamp - a.timestamp);

  // Remove duplicates (same tx appears in sender and receiver)
  const seen = new Set<string>();
  const unique = history.filter(tx => {
    const key = `${tx.sender}:${tx.receiver}:${tx.token}:${tx.timestamp}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
};

// Get transaction proof for a user
export const getTxProof = async (
  sender: string,
  receiver: string,
  token: string,
  forWallet: string
): Promise<TransactionProof> => {
  const userSecret = await getTxSecret(forWallet);
  if (!userSecret) {
    throw new Error('User has not set transaction secret');
  }

  const key = generateTxKey(sender, receiver, token, userSecret);
  const proof = txSmt.createProof(key);
  const value = txSmt.get(key);

  return {
    root: normalize(String(proof.root)),
    siblings: proof.sidenodes.map(s => normalize(String(s))),
    key: key,
    value: value ? String(value) : '0',
  };
};

// Get current transaction SMT root
export const getTxRoot = (): string => {
  return String(txSmt.root);
};

// Verify a transaction proof
export const verifyTxProof = (proof: TransactionProof): boolean => {
  const smtProof = txSmt.createProof(proof.key);
  return normalize(String(smtProof.root)) === proof.root;
};
