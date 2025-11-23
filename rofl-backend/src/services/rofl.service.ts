import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { RoflClient, KeyKind } from '@oasisprotocol/rofl-client';
import { env } from '../config/env';

// In-memory storage for ROFL wallet
let roflPrivateKey: `0x${string}` | null = null;
let roflAccount: ReturnType<typeof privateKeyToAccount> | null = null;

// Viem clients for Base Sepolia
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export const initializeRoflWallet = async (): Promise<void> => {
  try {
    const client = new RoflClient(); // UDS: /run/rofl-appd.sock

    const key = await client.generateKey('void-wallet', KeyKind.SECP256K1);
    roflPrivateKey = key.startsWith('0x') ? key as `0x${string}` : `0x${key}`;
    roflAccount = privateKeyToAccount(roflPrivateKey);

    console.log(`ROFL wallet initialized: ${roflAccount.address}`);
  } catch (error) {
    console.error('Failed to initialize ROFL wallet:', error);
    throw error;
  }
};

export const getRoflWalletAddress = (): string => {
  if (!roflAccount) {
    throw new Error('ROFL wallet not initialized');
  }
  return roflAccount.address;
};

// ERC20 decimals ABI
const erc20DecimalsAbi = [
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export const withdraw = async (to: string, amount: string, token: string): Promise<string> => {
  if (!roflAccount || !roflPrivateKey) {
    throw new Error('ROFL wallet not initialized');
  }

  // Get token decimals
  const decimals = await publicClient.readContract({
    address: token as `0x${string}`,
    abi: erc20DecimalsAbi,
    functionName: 'decimals',
  });

  // Convert decimal amount to raw amount (e.g., "2" USDC -> 2000000)
  const rawAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));

  const walletClient = createWalletClient({
    account: roflAccount,
    chain: baseSepolia,
    transport: http(),
  });

  // Withdraw function ABI
  const withdrawAbi = [
    {
      name: 'withdraw',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'tokenAddress', type: 'address' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ] as const;

  const hash = await walletClient.writeContract({
    address: env.VOID_CONTRACT_ADDRESS as `0x${string}`,
    abi: withdrawAbi,
    functionName: 'withdraw',
    args: [to as `0x${string}`, rawAmount, token as `0x${string}`],
  });

  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return receipt.transactionHash;
};
