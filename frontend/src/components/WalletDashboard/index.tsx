"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export function WalletDashboard({ wallet }: WalletDashboardProps) {
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
      try {
        setIsLoadingTransactions(true);
        setTransactionsError(null);
        const apiTransactions = await fetchWalletTransactions();
        if (!isMounted) {
          return;
        }

        const sortedTransactions = [...apiTransactions].sort(
          (a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0)
        );

        setTransactions(sortedTransactions);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setTransactionsError(
          error instanceof Error ? error.message : "Failed to load transactions"
        );
        setTransactions([]);
      } finally {
        if (isMounted) {
          setIsLoadingTransactions(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isMounted = false;
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
      setTransactionsError(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
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
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
            >
              <ArrowUpRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0A] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription className="text-white/60">
                Withdraw funds from your Void Wallet account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center text-white/40 text-sm">
              Withdraw functionality coming soon.
            </div>
          </DialogContent>
        </Dialog>

        <SendTokenDialog
          tokens={assetsFromBackend}
          onSuccess={handleDepositSuccess}
        />

        {/* Swap - Placeholder for now */}
        <Button
          variant="outline"
          className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
        >
          <ArrowLeftRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
          Swap
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
              onClick={() => setActiveTab(tab.id as any)}
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
