import { createHmac } from 'crypto';
import { env } from '../config/env';
import { setBalance, getBalance, updateBalance } from './balance.service';
import { addTransaction } from './transaction.service';
import { hasBalanceSecret } from './secret.service';
import { decodeEventLog, createPublicClient, http, erc20Abi } from 'viem';
import { baseSepolia } from 'viem/chains';

// Public client for reading token decimals
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// Deposited event ABI
const DEPOSITED_EVENT_ABI = {
  type: 'event',
  name: 'Deposited',
  inputs: [
    { indexed: true, name: 'user', type: 'address' },
    { indexed: false, name: 'amount', type: 'uint256' },
    { indexed: false, name: 'tokenAddress', type: 'address' }
  ]
} as const;

// Verify Alchemy webhook signature
export const verifyAlchemySignature = (
  payload: string,
  signature: string
): boolean => {
  if (!env.ALCHEMY_SIGNING_KEY) {
    console.warn('ALCHEMY_SIGNING_KEY not set, skipping verification');
    return true; // Allow in development
  }

  const hmac = createHmac('sha256', env.ALCHEMY_SIGNING_KEY);
  hmac.update(payload, 'utf8');
  const expectedSignature = hmac.digest('hex');

  return signature === expectedSignature;
};

// Process Alchemy webhook payload
export const processAlchemyWebhook = async (payload: any): Promise<void> => {

  const { event } = payload;

  if (!event || !event.data) {
    throw new Error('Invalid webhook payload');
  }


  const { block } = event.data;
  const logs = block?.logs;

  if (!logs || logs.length === 0) {
    console.log('No logs in webhook event');
    return;
  }

  for (const log of logs) {
    await processLog(log);
  }
};

// Process a single log entry
const processLog = async (log: any): Promise<void> => {
  // GraphQL format: account.address instead of address
  const address = log.account?.address || log.address;
  const { topics, data } = log;

  // Verify contract address
  if (address.toLowerCase() !== env.VOID_CONTRACT_ADDRESS.toLowerCase()) {
    console.log(`Ignoring event from unknown contract: ${address}`);
    return;
  }

  // Check if this is a Deposited event (by topic[0])
  // keccak256("Deposited(address,uint256,address)")
  const depositedTopic = '0xb4e1304f97b5093610f51b33ddab6622388422e2dac138b0d32f93dcfbd39edf';

  if (topics[0] !== depositedTopic) {
    console.log('Not a Deposited event, skipping');
    return;
  }

  try {
    // Decode the event
    const decoded = decodeEventLog({
      abi: [DEPOSITED_EVENT_ABI],
      data,
      topics
    });

    const { user, amount, tokenAddress } = decoded.args as {
      user: string;
      amount: bigint;
      tokenAddress: string;
    };

    console.log('Decoded event:', decoded);
    console.log('User:', user);
    console.log('Amount:', amount.toString());
    console.log('Token address:', tokenAddress);

    console.log(`Processing deposit: user=${user}, amount=${amount.toString()}, token=${tokenAddress}`);

    // Check if user has set their balance secret
    const hasSecret = await hasBalanceSecret(user);
    if (!hasSecret) {
      console.warn(`User ${user} has not set balance secret, deposit will be processed when they do`);
      // TODO: Queue deposit for later processing
      return;
    }

    // Get token decimals and normalize amount
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals'
    });
    const amountDecimal = Number(amount) / Math.pow(10, decimals);

    console.log(`Token decimals: ${decimals}, normalized amount: ${amountDecimal}`);

    // Get current balance and add deposit
    const currentBalance = await getBalance(user, tokenAddress);
    const newBalance = (parseFloat(currentBalance) + amountDecimal).toString();

    // Update balance
    await updateBalance(user, tokenAddress, newBalance);

    // Add to transaction history
    await addTransaction(env.VOID_CONTRACT_ADDRESS, user, tokenAddress, amountDecimal.toString());

    console.log(`Deposit processed: ${user} now has ${newBalance} of ${tokenAddress}`);
  } catch (error) {
    console.error('Error processing deposit event:', error);
    throw error;
  }
};
