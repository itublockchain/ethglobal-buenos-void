"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  ArrowLeftRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useSignMessage,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { erc20Abi, formatUnits, parseUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import {
  submitTransferSignature,
  type SendTransaction,
} from "@/lib/sign/transfer";
import { fetchWalletBalances, type TokenBalance } from "@/lib/balance";
import {
  fetchWalletTransactions,
  type WalletTransaction,
} from "@/lib/transactions";
import { getTokenLogoUrl } from "@/lib/utils";

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
const VOID_CONTRACT_ADDRESS =
  "0x017669FB1b0d1A4ec1BaA8a9D6c62fdbf3E3c58a" as Address;

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
}

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

  const refreshBalances = async () => {
    try {
      setIsLoadingBalances(true);
      setBalanceError(null);
      const data = await fetchWalletBalances();
      setBackendBalances(data.balances);
    } catch (error) {
      console.error("Failed to refresh balances:", error);
      setBalanceError(
        error instanceof Error ? error.message : "Failed to load balances"
      );
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const refreshTransactions = async () => {
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
  };
  // Calculate total USD value from backend balances
  const totalUsdFromBackend = useMemo(() => {
    // backendBalances array of objects with amount and value properties
    const calculatedTotal = backendBalances.reduce((acc, balance) => {
      const balanceValue = parseFloat(balance.balance);
      let amount = 0;
      if (!isNaN(balanceValue)) {
        amount = balanceValue;
      }

      // Mock pricing for demo purposes
      const isEth =
        balance.token === "0x0000000000000000000000000000000000000000";
      const price = isEth ? 1800 : 1;
      return acc + amount * price;
    }, 0);

    return calculatedTotal;
  }, [backendBalances]);

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

      // TODO: Calculate USD value with real price data
      const value = amount * (symbol === "ETH" ? 1800 : 1); // Mock prices

      // Get actual backend token address
      const tokenAddress = balance.token;

      return {
        symbol,
        name,
        amount,
        value,
        address: tokenAddress,
      };
    });
  }, [backendBalances, wallet.assets, tokenMetadata, unknownTokens]);

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
        <DepositDialog />

        {/* Withdraw */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group"
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
          onSuccess={async () => {
            await Promise.all([refreshBalances(), refreshTransactions()]);
          }}
        />

        {/* Swap - Placeholder for now */}
        <Button
          variant="outline"
          className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group"
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
            <div className="space-y-2">
              {/* List Header */}
              <div className="flex items-center justify-between text-xs text-white/40 px-4 pb-2">
                <span>Token name</span>
                <span>Portfolio %</span>
              </div>

              {/* Loading State */}
              {isLoadingBalances && (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                          <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse ml-auto" />
                        <div className="h-3 w-16 bg-white/10 rounded animate-pulse ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {balanceError && !isLoadingBalances && (
                <div className="text-center py-12 text-red-400 text-sm">
                  {balanceError}
                </div>
              )}

              {/* List Items */}
              {!isLoadingBalances && !balanceError && (
                <div className="space-y-2">
                  {assetsFromBackend.map((asset, i) => {
                    const portfolioPercentage =
                      (asset.value / totalUsdFromBackend) * 100;

                    const logoUrl = asset.address
                      ? getTokenLogoUrl(asset.address)
                      : "";

                    return (
                      <motion.div
                        key={asset.symbol}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={asset.symbol}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // If image fails to load, hide it and show fallback
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement!.innerText =
                                    asset.symbol?.[0] ?? "?";
                                }}
                              />
                            ) : (
                              asset.symbol?.[0] ?? "?"
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {asset.symbol}
                            </div>
                            <div className="text-xs text-white/40">
                              {asset.amount.toFixed(6)} {asset.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-white text-sm">
                            ${asset.value.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/40">
                            {portfolioPercentage.toFixed(2)}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-2">
              {/* List Header */}
              <div className="flex items-center justify-between text-xs text-white/40 px-4 pb-2">
                <span>Activity</span>
                <span>Time</span>
              </div>

              {/* Loading State */}
              {isLoadingTransactions && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                          <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {transactionsError && !isLoadingTransactions && (
                <div className="text-center py-12 text-red-400 text-sm">
                  {transactionsError}
                </div>
              )}

              {/* Empty State */}
              {!isLoadingTransactions &&
                !transactionsError &&
                transactions.length === 0 && (
                  <div className="text-center py-20 text-white/20 text-sm">
                    No transaction history found.
                  </div>
                )}

              {/* Transaction List */}
              {!isLoadingTransactions &&
                !transactionsError &&
                transactions.length > 0 && (
                  <div className="space-y-2">
                    {transactions.map((tx, i) => {
                      const isSent = tx.type === "sent";
                      const Icon = isSent ? ArrowUpRight : ArrowDownLeft;
                      const iconColor = isSent
                        ? "text-red-400"
                        : "text-green-400";

                      // Find token info
                      const tokenInfo = backendBalances.find(
                        (b) => b.token.toLowerCase() === tx.token.toLowerCase()
                      );
                      const matchingToken = SUPPORTED_TOKENS.find(
                        (t) =>
                          t.address?.toLowerCase() === tx.token.toLowerCase()
                      );

                      const tokenSymbol =
                        matchingToken?.symbol || tokenInfo?.symbol || "UNKNOWN";

                      // Format timestamp
                      const txTimestamp =
                        typeof tx.timestamp === "string"
                          ? parseInt(tx.timestamp)
                          : tx.timestamp;
                      const now = Date.now();
                      const diffMs = now - txTimestamp;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);

                      let timeAgo = "";
                      if (diffMins < 1) {
                        timeAgo = "Just now";
                      } else if (diffMins < 60) {
                        timeAgo = `${diffMins} min${
                          diffMins > 1 ? "s" : ""
                        } ago`;
                      } else if (diffHours < 24) {
                        timeAgo = `${diffHours} hour${
                          diffHours > 1 ? "s" : ""
                        } ago`;
                      } else {
                        timeAgo = `${diffDays} day${
                          diffDays > 1 ? "s" : ""
                        } ago`;
                      }

                      // Truncate addresses for display
                      const truncateAddress = (addr: string) =>
                        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

                      return (
                        <motion.div
                          key={`${tx.sender}-${tx.receiver}-${tx.timestamp}-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                              <Icon className={`w-5 h-5 ${iconColor}`} />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">
                                {isSent ? "Sent" : "Received"}
                              </div>
                              <div className="text-xs text-white/40">
                                {isSent ? "To" : "From"}{" "}
                                {truncateAddress(
                                  isSent ? tx.receiver : tx.sender
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-white text-sm">
                              {isSent ? "-" : "+"}
                              {parseFloat(tx.amount).toFixed(4)} {tokenSymbol}
                            </div>
                            <div className="text-xs text-white/40">
                              {timeAgo}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
            </div>
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

function DepositDialog() {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<
    Address | undefined
  >();
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Public wallet token balances (connected wallet)
  const { data: ethBalance } = useBalance({
    address,
    chainId: baseSepolia.id,
  });

  // ERC20 token balances from connected wallet
  const erc20TokenAddresses = SUPPORTED_TOKENS.filter(
    (t) => t.type === "erc20"
  ).map((t) => t.address!);

  const { data: erc20Balances } = useReadContracts({
    contracts: erc20TokenAddresses.flatMap((tokenAddress) => [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address!, VOID_CONTRACT_ADDRESS],
        chainId: baseSepolia.id,
      },
    ]),
    query: {
      enabled: !!address && erc20TokenAddresses.length > 0,
    },
  });

  // Parse ERC20 balances
  const publicWalletTokens = useMemo(() => {
    const tokens: Array<{
      address: Address;
      symbol: string;
      decimals: number;
      balance: bigint;
      formattedBalance: string;
      allowance: bigint;
    }> = [];

    if (erc20Balances) {
      for (let i = 0; i < erc20TokenAddresses.length; i++) {
        const baseIndex = i * 4;
        const balanceResult = erc20Balances[baseIndex];
        const symbolResult = erc20Balances[baseIndex + 1];
        const decimalsResult = erc20Balances[baseIndex + 2];
        const allowanceResult = erc20Balances[baseIndex + 3];

        if (
          balanceResult?.status === "success" &&
          symbolResult?.status === "success" &&
          decimalsResult?.status === "success" &&
          allowanceResult?.status === "success"
        ) {
          const balance = balanceResult.result as bigint;
          const decimals = decimalsResult.result as number;
          const allowance = allowanceResult.result as bigint;

          tokens.push({
            address: erc20TokenAddresses[i],
            symbol: symbolResult.result as string,
            decimals,
            balance,
            formattedBalance: formatTokenBalance(balance, decimals),
            allowance,
          });
        }
      }
    }

    return tokens;
  }, [erc20Balances, erc20TokenAddresses]);

  const selectedToken = publicWalletTokens.find(
    (t) => t.address === selectedTokenAddress
  );

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Deposit transaction
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    error: depositError,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    });

  // Handle approve success - move to step 3
  useEffect(() => {
    if (isApproveSuccess && currentStep === 2) {
      setCurrentStep(3);
      setError(null);
    }
  }, [isApproveSuccess, currentStep]);

  // Handle deposit success - close modal
  useEffect(() => {
    if (isDepositSuccess && currentStep === 3) {
      setTimeout(() => {
        setOpen(false);
        // Reset state
        setCurrentStep(1);
        setSelectedTokenAddress(undefined);
        setDepositAmount("");
        setError(null);
      }, 2000);
    }
  }, [isDepositSuccess, currentStep]);

  // Handle approve
  const handleApprove = async () => {
    if (!selectedToken || !depositAmount) {
      setError("Lütfen token ve miktar seçin");
      return;
    }

    try {
      setError(null);
      const amountInWei = parseUnits(depositAmount, selectedToken.decimals);

      writeApprove({
        address: selectedToken.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [VOID_CONTRACT_ADDRESS, amountInWei],
        chainId: baseSepolia.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve başarısız");
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!selectedToken || !depositAmount) {
      setError("Lütfen token ve miktar seçin");
      return;
    }

    try {
      setError(null);
      const amountInWei = parseUnits(depositAmount, selectedToken.decimals);

      writeDeposit({
        address: VOID_CONTRACT_ADDRESS,
        abi: VOID_CONTRACT_ABI,
        functionName: "deposit",
        args: [amountInWei, selectedToken.address],
        chainId: baseSepolia.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit başarısız");
    }
  };

  const parsedAmount = useMemo(() => {
    const n = parseFloat(depositAmount);
    return Number.isFinite(n) ? n : 0;
  }, [depositAmount]);

  const parsedBalance = useMemo(() => {
    if (!selectedToken) return 0;
    return parseFloat(
      formatUnits(selectedToken.balance, selectedToken.decimals)
    );
  }, [selectedToken]);

  const isInsufficientBalance = parsedAmount > parsedBalance;

  // Check if user needs to approve more
  const needsApproval = useMemo(() => {
    if (!selectedToken || !depositAmount) return false;
    try {
      const amountInWei = parseUnits(depositAmount, selectedToken.decimals);
      return selectedToken.allowance < amountInWei;
    } catch {
      return false;
    }
  }, [selectedToken, depositAmount]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          // Reset on close
          setTimeout(() => {
            setCurrentStep(1);
            setSelectedTokenAddress(undefined);
            setDepositAmount("");
            setError(null);
          }, 200);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group"
        >
          <ArrowDownLeft className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#050505] border border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription className="text-white/60">
            Void Wallet&apos;a ERC20 token yatırın.
          </DialogDescription>
        </DialogHeader>

        {!address ? (
          <div className="text-center text-white/60 border border-white/10 rounded-2xl py-12 text-sm">
            Lütfen cüzdanınızı bağlayın.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold transition-all ${
                      currentStep >= step
                        ? "border-white bg-white text-black"
                        : "border-white/20 text-white/40"
                    }`}
                  >
                    {step === 2 && isApproveSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : step === 3 && isDepositSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-all ${
                        currentStep > step ? "bg-white" : "bg-white/20"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs text-white/40 -mt-2">
              <span>Token Seç</span>
              <span>Onayla</span>
              <span>Yatır</span>
            </div>

            {/* Step 1: Select Token & Amount */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-white">
                  1. ERC20 Token Seçin
                </div>
                <div className="text-xs text-white/60 mb-4">
                  Public Wallet&apos;taki bakiyeleriniz:
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {publicWalletTokens.length === 0 ? (
                    <div className="text-center text-white/40 py-8 text-sm border border-white/10 rounded-2xl">
                      Public wallet&apos;ta ERC20 token bulunamadı.
                    </div>
                  ) : (
                    publicWalletTokens.map((token) => {
                      const isSelected = selectedTokenAddress === token.address;
                      const logoUrl = getTokenLogoUrl(token.address);

                      return (
                        <button
                          key={token.address}
                          type="button"
                          onClick={() => setSelectedTokenAddress(token.address)}
                          className={`relative flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                            isSelected
                              ? "border-white/60 bg-white/5"
                              : "border-white/10 bg-black/20 hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={token.symbol}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement!.textContent =
                                      token.symbol[0];
                                  }}
                                />
                              ) : (
                                token.symbol[0]
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">
                                {token.symbol}
                              </div>
                              <div className="text-xs text-white/40">
                                Bakiye: {token.formattedBalance}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-white" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedToken && (
                  <div className="space-y-2 pt-4">
                    <span className="text-[11px] text-white/50 tracking-[0.3em] uppercase">
                      Miktar
                    </span>
                    <Input
                      placeholder="0.0"
                      type="text"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="bg-black/40 border-white/20 text-white placeholder:text-white/30"
                    />
                    <div className="text-[11px] text-white/40">
                      Mevcut: {selectedToken.formattedBalance}{" "}
                      {selectedToken.symbol}
                    </div>
                    {isInsufficientBalance && depositAmount && (
                      <div className="text-[11px] text-red-400">
                        Yetersiz bakiye
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full h-12 uppercase tracking-[0.3em] text-xs text-white/80 border-white/30 hover:border-white hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (needsApproval) {
                      setCurrentStep(2);
                    } else {
                      setCurrentStep(3);
                    }
                  }}
                  disabled={
                    !selectedToken ||
                    !depositAmount ||
                    isInsufficientBalance ||
                    parsedAmount <= 0
                  }
                >
                  Devam Et
                </Button>
              </div>
            )}

            {/* Step 2: Approve */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-white">
                  2. ERC20 Token Onayı
                </div>
                <div className="text-xs text-white/60 mb-4">
                  Void Contract&apos;ın tokenlarınızı harcamasına izin verin.
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Token:</span>
                    <span className="text-sm font-bold text-white">
                      {selectedToken?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Miktar:</span>
                    <span className="text-sm font-bold text-white">
                      {depositAmount} {selectedToken?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Contract:</span>
                    <span className="text-xs font-mono text-white/80">
                      {VOID_CONTRACT_ADDRESS.slice(0, 10)}...
                      {VOID_CONTRACT_ADDRESS.slice(-8)}
                    </span>
                  </div>
                </div>

                {approveError && (
                  <div className="text-xs text-red-400 text-center">
                    {approveError.message}
                  </div>
                )}

                {error && (
                  <div className="text-xs text-red-400 text-center">
                    {error}
                  </div>
                )}

                {isApproveSuccess && (
                  <div className="text-xs text-emerald-400 text-center">
                    ✓ Onay başarılı! Bir sonraki adıma geçiliyor...
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 uppercase tracking-[0.3em] text-xs text-white/60 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
                    onClick={() => setCurrentStep(1)}
                    disabled={isApprovePending || isApproveConfirming}
                  >
                    Geri
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 uppercase tracking-[0.3em] text-xs text-white/80 border-white/30 hover:border-white hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleApprove}
                    disabled={
                      isApprovePending ||
                      isApproveConfirming ||
                      isApproveSuccess
                    }
                  >
                    {isApprovePending || isApproveConfirming
                      ? "Onaylanıyor..."
                      : isApproveSuccess
                      ? "Onaylandı ✓"
                      : "Onayla"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Deposit */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-white">
                  3. Token Yatırma
                </div>
                <div className="text-xs text-white/60 mb-4">
                  Tokenlarınızı Void Wallet&apos;a yatırın.
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Token:</span>
                    <span className="text-sm font-bold text-white">
                      {selectedToken?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Miktar:</span>
                    <span className="text-sm font-bold text-white">
                      {depositAmount} {selectedToken?.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Hedef:</span>
                    <span className="text-xs font-mono text-white/80">
                      Void Wallet Contract
                    </span>
                  </div>
                </div>

                {depositError && (
                  <div className="text-xs text-red-400 text-center">
                    {depositError.message}
                  </div>
                )}

                {error && (
                  <div className="text-xs text-red-400 text-center">
                    {error}
                  </div>
                )}

                {isDepositSuccess && (
                  <div className="text-xs text-emerald-400 text-center">
                    ✓ Yatırma işlemi başarılı! Modal kapatılıyor...
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 uppercase tracking-[0.3em] text-xs text-white/60 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
                    onClick={() => {
                      if (needsApproval) {
                        setCurrentStep(2);
                      } else {
                        setCurrentStep(1);
                      }
                    }}
                    disabled={isDepositPending || isDepositConfirming}
                  >
                    Geri
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 uppercase tracking-[0.3em] text-xs text-white/80 border-white/30 hover:border-white hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDeposit}
                    disabled={
                      isDepositPending ||
                      isDepositConfirming ||
                      isDepositSuccess
                    }
                  >
                    {isDepositPending || isDepositConfirming
                      ? "Yatırılıyor..."
                      : isDepositSuccess
                      ? "Yatırıldı ✓"
                      : "Yatır"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SendTokenDialog({
  tokens,
  onSuccess,
}: {
  tokens: Asset[];
  onSuccess?: () => Promise<void> | void;
}) {
  const { address } = useAccount();
  const tokensWithId = useMemo(
    () => tokens.map((t) => ({ ...t, id: t.address ?? t.symbol })),
    [tokens]
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    if (!tokensWithId || tokensWithId.length === 0) return;
    const firstWithBalance = tokensWithId.find((t) => (t.amount ?? 0) > 0);
    setSelectedTokenId(
      (prev) => prev ?? firstWithBalance?.id ?? tokensWithId[0].id
    );
  }, [tokensWithId]);
  const [open, setOpen] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const selectedToken =
    tokensWithId.find((token) => token.id === selectedTokenId) ??
    tokensWithId[0];

  const parsedAmount = (() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  })();
  const insufficient = (selectedToken?.amount ?? 0) < parsedAmount;

  const isWalletDisconnected = !address;
  const needsNetworkSwitch = false;

  const handleSendTransaction = async () => {
    if (!address || !signMessageAsync) {
      setSendError("Wallet not connected");
      return;
    }

    if (!recipientAddress || !amount) {
      setSendError("Please fill in all fields");
      return;
    }

    // Basic validation
    if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
      setSendError("Invalid recipient address");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSendError("Invalid amount");
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const sendTransaction: SendTransaction = {
        from: address,
        to: recipientAddress,
        token:
          selectedToken?.address ||
          "0x0000000000000000000000000000000000000000",
        amount: amount,
      };

      // Create message to sign
      const message = JSON.stringify(sendTransaction);

      // Sign the transaction
      const signature = await signMessageAsync({ message });

      // Submit to backend
      const result = await submitTransferSignature(sendTransaction, signature);

      if (result.success) {
        setSendSuccess(true);
        setRecipientAddress("");
        setAmount("");
        try {
          await onSuccess?.();
        } catch (e) {
          console.error("Post-transfer refresh failed:", e);
        }
        // Close modal after successful transfer
        setTimeout(() => {
          setOpen(false);
        }, 1000);
      } else {
        setSendError(result.message || "Transfer failed");
      }
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          // Reset form when dialog opens
          setRecipientAddress("");
          setAmount("");
          setSendError(null);
          setSendSuccess(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group"
        >
          <ArrowRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
          Send
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#050505] border border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Assets</DialogTitle>
          <DialogDescription className="text-white/60">
            Review balances from your connected wallet.
          </DialogDescription>
        </DialogHeader>

        {isWalletDisconnected ? (
          <div className="text-center text-white/60 border border-white/10 rounded-2xl py-12 text-sm">
            Connect your wallet to view available tokens.
          </div>
        ) : needsNetworkSwitch ? (
          <div className="text-center text-white/60 border border-yellow-500/40 bg-yellow-500/5 rounded-2xl py-12 text-sm">
            Switch your wallet network to Ethereum Mainnet to load balances.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.4em] text-white/40 px-1">
                Select token
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tokensWithId.map((token) => {
                  const isSelected = selectedTokenId === token.id;
                  const logoUrl = token.address
                    ? getTokenLogoUrl(token.address)
                    : "";
                  return (
                    <button
                      key={token.id}
                      type="button"
                      onClick={() => setSelectedTokenId(token.id)}
                      className={`relative flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-white/60 bg-white/5"
                          : "border-white/10 bg-black/20 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={token.symbol}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.parentElement!.textContent =
                                  token.symbol?.[0] ?? "?";
                              }}
                            />
                          ) : (
                            token.symbol?.[0] ?? "?"
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {token.symbol}
                          </div>
                          <div className="text-xs text-white/40">
                            {token.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <div className="text-sm font-semibold text-white">
                          {token.amount.toFixed(6)}
                        </div>
                        <div className="text-xs text-white/40">
                          {token.symbol}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 space-y-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
                <span>Send details</span>
                <span className="text-white tracking-[0.3em]">
                  {selectedToken?.symbol}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] text-white/50 tracking-[0.3em] uppercase">
                  Recipient address
                </span>
                <Input
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="bg-black/40 border-white/20 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] text-white/50 tracking-[0.3em] uppercase">
                  Amount
                </span>
                <Input
                  placeholder="0.0"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-black/40 border-white/20 text-white placeholder:text-white/30"
                />
                <div className="text-[11px] text-white/40">
                  Balance: {selectedToken?.amount.toFixed(6)}{" "}
                  {selectedToken?.symbol}
                </div>
                {insufficient && (
                  <div className="text-[11px] text-red-400">
                    Insufficient balance
                  </div>
                )}
              </div>

              {sendError && (
                <div className="text-[11px] text-red-400 text-center">
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div className="text-[11px] text-emerald-400 text-center">
                  Transfer submitted successfully!
                </div>
              )}

              <Button
                variant="outline"
                className="w-full h-12 uppercase tracking-[0.3em] text-xs text-white/80 border-white/30 hover:border-white hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSendTransaction}
                disabled={
                  isSending || !recipientAddress || !amount || insufficient
                }
              >
                {isSending ? "Sending..." : "Send Transaction"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
