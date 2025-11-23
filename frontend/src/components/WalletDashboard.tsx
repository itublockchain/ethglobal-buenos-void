"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { erc20Abi, formatUnits, parseUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { fetchWalletBalances, type TokenBalance } from "@/lib/balance";
import {
  fetchWalletTransactions,
  type WalletTransaction,
} from "@/lib/transactions";
import { usePublicWalletTokens } from "@/hooks/usePublicWalletTokens";
import { DepositDialog } from "./WalletDashboard/DepositDialog";
import { WithdrawDialog } from "./WalletDashboard/WithdrawDialog";
import { SendTokenDialog } from "./WalletDashboard/SendTokenDialog";
import { TokenList } from "./WalletDashboard/TokenList";
import { TransactionHistory } from "./WalletDashboard/TransactionHistory";

type SupportedToken = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  type: "native" | "erc20";
  address?: Address;
  description: string;
};

type TokenWithBalance = SupportedToken & {
  balanceRaw: bigint;
  formattedBalance: string;
  isBalanceLoading: boolean;
};

const SUPPORTED_TOKENS: SupportedToken[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Ether",
    type: "native",
    decimals: 18,
    description: "Native token on Base Sepolia",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    type: "erc20",
    decimals: 6,
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    description: "Circle USD Coin on Base Sepolia",
  },
];

// Void Contract Address on Base Sepolia
const VOID_CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_VOID_CONTRACT_ADDRESS as Address;

// Void Contract ABI - sadece ihtiyacımız olan fonksiyonlar
const VOID_CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "tokenAddress", type: "address" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface Asset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  address?: string;
}

interface Wallet {
  id: string;
  name: string;
  address: string;
  totalUsd: number;
  assets: Asset[];
}

interface WalletDashboardProps {
  wallet: Wallet;
  onTokensUpdate?: (tokens: Asset[]) => void;
}

export function WalletDashboard({
  wallet,
  onTokensUpdate,
}: WalletDashboardProps) {
  const [activeTab, setActiveTab] = useState<"tokens" | "history">("tokens");
  const [backendBalances, setBackendBalances] = useState<TokenBalance[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null
  );
  // Get public wallet tokens for logo mapping
  const { tokens: publicWalletTokens } = usePublicWalletTokens();

  // Create logo map from publicWalletTokens
  const tokenLogos = useMemo(() => {
    const logos = new Map<string, string>();
    publicWalletTokens.forEach((token) => {
      if (token.logo) {
        logos.set(token.address.toLowerCase(), token.logo);
      }
    });
    return logos;
  }, [publicWalletTokens]);

  // Fetch token metadata (symbol, name) for unknown tokens
  const unknownTokens = useMemo(() => {
    return backendBalances
      .filter(
        (b) =>
          b.token !== "0x0000000000000000000000000000000000000000" &&
          !SUPPORTED_TOKENS.some(
            (t) => t.address?.toLowerCase() === b.token.toLowerCase()
          )
      )
      .map((b) => b.token as Address);
  }, [backendBalances]);

  const { data: tokenMetadata } = useReadContracts({
    contracts: unknownTokens.flatMap((address) => [
      {
        address,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: baseSepolia.id,
      },
      {
        address,
        abi: erc20Abi,
        functionName: "name",
        chainId: baseSepolia.id,
      },
      {
        address,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: baseSepolia.id,
      },
    ]),
    query: {
      enabled: unknownTokens.length > 0,
      staleTime: Infinity,
    },
  });

  // Fetch token metadata with prices for backend balances
  const [tokenPrices, setTokenPrices] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    if (!backendBalances || backendBalances.length === 0) {
      setTokenPrices(new Map());
      return;
    }

    const fetchPrices = async () => {
      try {
        // Wait for tokenMetadata to be available to get on-chain symbols
        // This ensures we have the most accurate symbol for price fetching
        const tokensToFetch = backendBalances
          .filter((balance) => {
            const isEth =
              balance.token === "0x0000000000000000000000000000000000000000";
            return !isEth;
          })
          .map((balance) => {
            // Try to get symbol from multiple sources
            let symbol =
              balance.symbol ||
              SUPPORTED_TOKENS.find(
                (t) => t.address?.toLowerCase() === balance.token.toLowerCase()
              )?.symbol;

            // If symbol is still missing, try to get from on-chain metadata
            if (!symbol && tokenMetadata) {
              const index = unknownTokens.indexOf(balance.token as Address);
              if (index !== -1) {
                const baseIndex = index * 3;
                const symbolResult = tokenMetadata[baseIndex];
                if (symbolResult?.status === "success") {
                  symbol = symbolResult.result as string;
                }
              }
            }

            return {
              address: balance.token,
              symbol,
            };
          })
          .filter((t) => t.symbol) as Array<{
          address: string;
          symbol: string;
        }>;

        if (tokensToFetch.length === 0) return;

        // Fetch prices from API route
        const response = await fetch("/api/token-prices", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tokens: tokensToFetch }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch prices");
        }

        const data = await response.json();
        const prices = new Map<string, number>();
        Object.entries(data.prices || {}).forEach(([address, price]) => {
          prices.set(address.toLowerCase(), price as number);
        });

        setTokenPrices(prices);
      } catch (error) {
        console.error("Failed to fetch token prices:", error);
      }
    };

    // Fetch prices when backendBalances or tokenMetadata changes
    fetchPrices();
  }, [backendBalances, tokenMetadata, unknownTokens]);

  // Get connected address to trigger refetch on address change
  const { address } = useAccount();
  const hasFetchedRef = useRef(false);

  // Fetch balances from backend - only once on mount
  useEffect(() => {
    // Prevent double fetch in React Strict Mode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const loadBalances = async () => {
      try {
        setIsLoadingBalances(true);
        setBalanceError(null);
        // Always force refresh to get fresh data from server
        const data = await fetchWalletBalances(true);
        setBackendBalances(data.balances);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setBalanceError(
          error instanceof Error ? error.message : "Failed to load balances"
        );
      } finally {
        setIsLoadingBalances(false);
      }
    };

    // Fetch fresh data on mount
    loadBalances();
  }, []); // Only run once on mount

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setIsLoadingTransactions(true);
        setTransactionsError(null);

        const apiTransactions = await fetchWalletTransactions();

        // Always update state - React will ignore if component is unmounted
        // This ensures transactions are set even if component was unmounted during fetch
        const sortedTransactions = [...apiTransactions].sort(
          (a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0)
        );

        setTransactions(sortedTransactions);
      } catch (error) {
        // Always update state - React will ignore if component is unmounted
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load transactions. Please try again.";
        setTransactionsError(errorMessage);
        setTransactions([]);
      } finally {
        // Always set loading to false
        // React will safely ignore state updates if component is unmounted
        setIsLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, []); // Only run once on mount

  const refreshBalances = useCallback(async () => {
    try {
      setIsLoadingBalances(true);
      setBalanceError(null);
      // Force refresh to bypass cache
      const data = await fetchWalletBalances(true);
      setBackendBalances(data.balances);
    } catch (error) {
      console.error("Failed to refresh balances:", error);
      setBalanceError(
        error instanceof Error ? error.message : "Failed to load balances"
      );
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      setTransactionsError(null);
      const apiTransactions = await fetchWalletTransactions();
      const sortedTransactions = [...apiTransactions].sort(
        (a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0)
      );
      setTransactions(sortedTransactions);
    } catch (error) {
      console.error("Failed to refresh transactions:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load transactions. Please try again.";
      setTransactionsError(errorMessage);
      // Don't clear transactions on error, keep showing previous data
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  // Convert backend balances to Asset format for display
  const assetsFromBackend = useMemo(() => {
    if (!backendBalances || backendBalances.length === 0) {
      return wallet.assets;
    }

    return backendBalances.map((balance) => {
      // Find matching token info from SUPPORTED_TOKENS
      // If balance.token is "0x00...00", it's ETH
      const isEth =
        balance.token === "0x0000000000000000000000000000000000000000";
      const matchingToken = SUPPORTED_TOKENS.find(
        (t) =>
          (isEth && t.symbol === "ETH") ||
          t.address?.toLowerCase() === balance.token.toLowerCase()
      );

      // Try to find metadata from useReadContracts
      let onChainSymbol: string | undefined;
      let onChainName: string | undefined;
      let onChainDecimals: number | undefined;

      if (!isEth && !matchingToken) {
        const index = unknownTokens.indexOf(balance.token as Address);
        if (index !== -1) {
          // Each token has 3 calls (symbol, name, decimals)
          const baseIndex = index * 3;
          onChainSymbol = tokenMetadata?.[baseIndex]?.result as string;
          onChainName = tokenMetadata?.[baseIndex + 1]?.result as string;
          onChainDecimals = tokenMetadata?.[baseIndex + 2]
            ?.result as unknown as number;
        }
      }

      // backend balance.balance is string, parse it safely
      // If we have onChainDecimals, we should use it to format the raw balance if needed
      // But for now assuming backend returns formatted or simple string number
      const balanceValue = parseFloat(balance.balance);

      let amount = 0;
      if (!isNaN(balanceValue)) {
        amount = balanceValue;
      }

      const symbol =
        matchingToken?.symbol || onChainSymbol || balance.symbol || "UNKNOWN";

      const name =
        matchingToken?.name ||
        onChainName ||
        (symbol === "ETH" ? "Ether" : symbol) ||
        "Unknown Token";

      // Get actual backend token address
      const tokenAddress = balance.token;

      // Get price from CoinGecko metadata only
      const price = tokenPrices.get(tokenAddress.toLowerCase()) || 0;
      const value = amount * price;

      // Get logo from tokenLogos map (from publicWalletTokens or fetched metadata)
      const logo = tokenLogos.get(tokenAddress.toLowerCase());

      return {
        symbol,
        name,
        amount,
        value,
        address: tokenAddress,
        logo, // Logo from publicWalletTokens or fetched metadata
      };
    });
  }, [
    backendBalances,
    wallet.assets,
    tokenMetadata,
    unknownTokens,
    tokenLogos,
    tokenPrices,
  ]);

  // Notify parent component when tokens update
  const onTokensUpdateRef = useRef(onTokensUpdate);
  const previousAssetsRef = useRef<string>("");

  useEffect(() => {
    onTokensUpdateRef.current = onTokensUpdate;
  }, [onTokensUpdate]);

  useEffect(() => {
    if (!onTokensUpdateRef.current || assetsFromBackend.length === 0) {
      return;
    }

    // Create a stable representation of assets for comparison
    const assetsKey = JSON.stringify(
      assetsFromBackend.map((a) => ({
        address: a.address,
        amount: a.amount,
        symbol: a.symbol,
      }))
    );

    // Only call callback if assets actually changed
    if (assetsKey !== previousAssetsRef.current) {
      previousAssetsRef.current = assetsKey;
      onTokensUpdateRef.current(assetsFromBackend);
    }
  }, [assetsFromBackend]);

  // Calculate total USD value from assets
  const totalUsdFromBackend = useMemo(() => {
    return assetsFromBackend.reduce((acc, asset) => acc + asset.value, 0);
  }, [assetsFromBackend]);

  // Memoized onSuccess callback for DepositDialog
  const handleDepositSuccess = useCallback(async () => {
    await Promise.all([refreshBalances(), refreshTransactions()]);
  }, [refreshBalances, refreshTransactions]);

  return (
    <>
      {/* Balance Display */}
      <motion.div
        key={wallet.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <h2 className="text-white/40 text-sm uppercase tracking-widest mb-2">
          Total Balance
        </h2>
        <div className="text-7xl font-bold tracking-tighter text-white font-mono">
          $
          {totalUsdFromBackend.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-4 mb-16">
        {/* Deposit */}
        <DepositDialog onSuccess={handleDepositSuccess} />

        {/* Withdraw */}
        <WithdrawDialog
          tokens={assetsFromBackend}
          onSuccess={handleDepositSuccess}
        />

        <SendTokenDialog
          tokens={assetsFromBackend}
          onSuccess={handleDepositSuccess}
        />

        {/* Swap - Placeholder for now */}
        <Button
          variant="outline"
          disabled
          className="h-14 border-white/10 bg-white/5 hover:bg-white/5 hover:text-white/40 hover:border-white/10 transition-all text-base uppercase tracking-wider font-medium group cursor-not-allowed opacity-50"
        >
          <ArrowLeftRight className="mr-2 w-4 h-4" />
          Swap <span className="ml-2 text-xs normal-case">soon</span>
        </Button>
      </div>

      {/* Tabs & List */}
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-white/10">
          {[
            { id: "tokens", label: "Tokens" },
            { id: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "tokens" | "history")}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === "tokens" && (
            <TokenList
              assets={assetsFromBackend}
              isLoading={isLoadingBalances}
              error={balanceError}
              totalUsd={totalUsdFromBackend}
            />
          )}

          {activeTab === "history" && (
            <TransactionHistory
              transactions={transactions}
              isLoading={isLoadingTransactions}
              error={transactionsError}
              tokenBalances={backendBalances}
            />
          )}
        </div>
      </div>
    </>
  );
}

function formatTokenBalance(value: bigint, decimals: number) {
  if (value === 0n) {
    return "0";
  }

  const numericValue = Number.parseFloat(formatUnits(value, decimals));

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  const fractionDigits = numericValue >= 1 ? 4 : 6;
  return numericValue.toLocaleString("en-US", {
    maximumFractionDigits: fractionDigits,
  });
}
