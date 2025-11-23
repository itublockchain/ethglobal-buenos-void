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
import { useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { fetchWalletBalances, type TokenBalance } from "@/lib/balance";
import {
  fetchWalletTransactions,
  type WalletTransaction,
} from "@/lib/transactions";
import { WalletDashboardProps } from "./types";
import { SUPPORTED_TOKENS } from "./constants";
import { DepositDialog } from "./DepositDialog";
import { SendTokenDialog } from "./SendTokenDialog";
import { TokenList } from "./TokenList";
import { TransactionHistory } from "./TransactionHistory";
import { WithdrawDialog } from "./WithdrawDialog";

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

  // Fetch balances from backend
  useEffect(() => {
    const loadBalances = async () => {
      try {
        setIsLoadingBalances(true);
        setBalanceError(null);
        const data = await fetchWalletBalances();
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

    loadBalances();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      console.log("Starting loadTransactions");
      try {
        setIsLoadingTransactions(true);
        setTransactionsError(null);

        console.log("Calling fetchWalletTransactions...");
        const apiTransactions = await fetchWalletTransactions();
        console.log(
          "fetchWalletTransactions returned:",
          apiTransactions?.length
        );

        if (!isMounted) {
          console.log("Component unmounted, skipping update");
          return;
        }

        const sortedTransactions = [...apiTransactions].sort(
          (a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0)
        );

        setTransactions(sortedTransactions);
        console.log("Transactions state updated");
      } catch (error) {
        console.error("Error in loadTransactions:", error);
        if (!isMounted) {
          return;
        }
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load transactions. Please try again.";
        setTransactionsError(errorMessage);
        setTransactions([]);
      } finally {
        console.log("loadTransactions finally block, isMounted:", isMounted);
        if (isMounted) {
          setIsLoadingTransactions(false);
          console.log("Set isLoadingTransactions to false");
        }
      }
    };

    loadTransactions();

    // Safety timeout to ensure loading state is cleared
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoadingTransactions((loading) => {
          if (loading) {
            console.warn(
              "Safety timeout: Forcing isLoadingTransactions to false"
            );
            setTransactionsError("Loading timed out. Please refresh.");
            return false;
          }
          return loading;
        });
      }
    }, 5000); // 5 seconds timeout

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  const refreshBalances = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoadingBalances(true);
      setBalanceError(null);
      const data = await fetchWalletBalances(forceRefresh);
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

  // Calculate total USD value from backend balances
  const totalUsdFromBackend = useMemo(() => {
    // backendBalances array of objects with amount and value properties
    const calculatedTotal = backendBalances.reduce((acc, balance) => {
      const balanceValue = parseFloat(balance.balance);
      let amount = 0;
      if (!isNaN(balanceValue)) {
        amount = balanceValue;
      }

      // TODO: Use real price API
      return acc;
    }, 0);

    return calculatedTotal;
  }, [backendBalances]);

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

  // Convert backend balances to Asset format for display
  const assetsFromBackend = useMemo(() => {
    if (!backendBalances || backendBalances.length === 0) {
      return [];
    }

    return backendBalances
      .map((balance) => {
        // Check if it's ETH (native token)
        const isEth =
          balance.token === "0x0000000000000000000000000000000000000000";

        // Find matching token from SUPPORTED_TOKENS (only for fallback)
        const matchingToken = SUPPORTED_TOKENS.find(
          (t) =>
            (isEth && t.symbol === "ETH") ||
            t.address?.toLowerCase() === balance.token.toLowerCase()
        );

        // Try to get on-chain metadata for unknown tokens
        let onChainSymbol: string | undefined;
        let onChainName: string | undefined;
        let onChainDecimals: number | undefined;

        if (!isEth && !matchingToken) {
          const tokenLower = balance.token.toLowerCase();
          const index = unknownTokens.findIndex(
            (t) => t.toLowerCase() === tokenLower
          );

          if (index !== -1 && tokenMetadata) {
            const baseIndex = index * 3;
            const symbolResult = tokenMetadata[baseIndex];
            const nameResult = tokenMetadata[baseIndex + 1];
            const decimalsResult = tokenMetadata[baseIndex + 2];

            if (symbolResult?.status === "success") {
              onChainSymbol = symbolResult.result as string;
            }

            if (nameResult?.status === "success") {
              onChainName = nameResult.result as string;
            }

            if (decimalsResult?.status === "success") {
              onChainDecimals = decimalsResult.result as unknown as number;
            }
          }
        }

        const balanceValue = parseFloat(balance.balance);
        const amount = !isNaN(balanceValue) ? balanceValue : 0;

        // Priority: on-chain data > fallback > UNKNOWN
        const symbol = onChainSymbol || matchingToken?.symbol || "UNKNOWN";
        const name =
          onChainName ||
          matchingToken?.name ||
          (symbol === "ETH" ? "Ether" : symbol);

        // TODO: Use real price API
        const value = 0;

        return {
          symbol,
          name,
          amount,
          value,
          address: balance.token,
          logo: undefined, // Logo will be fetched by TokenList component
        };
      })
      .filter((asset) => asset.amount > 0); // Filter out tokens with zero balance
  }, [backendBalances, wallet.assets, tokenMetadata, unknownTokens]);

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

  // Memoized onSuccess callback for DepositDialog
  // Force refresh to bypass cache after successful transaction
  const handleDepositSuccess = useCallback(async () => {
    await Promise.all([refreshBalances(true), refreshTransactions()]);
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
