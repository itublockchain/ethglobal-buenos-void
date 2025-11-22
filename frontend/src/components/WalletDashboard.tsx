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
} from "wagmi";
import { erc20Abi, formatUnits, type Address } from "viem";
import { sepolia } from "viem/chains";
import {
  submitTransferSignature,
  type SendTransaction,
} from "@/lib/sign/transfer";
import { fetchWalletBalances, type TokenBalance } from "@/lib/balance";

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

const SEPOLIA_TOKENS: SupportedToken[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Sepolia Ether",
    type: "native",
    decimals: 18,
    description: "Native gas token on Sepolia",
  },
  {
    id: "usdc",
    symbol: "USDC",
    name: "Circle USDC (Testnet)",
    type: "erc20",
    decimals: 6,
    address: "0x75Af732c6A21f3Cb6A1eD25468D66C199817f75c",
    description: "Stablecoin test token",
  },
];

interface Asset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
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
        setBalanceError(error instanceof Error ? error.message : "Failed to load balances");
      } finally {
        setIsLoadingBalances(false);
      }
    };

    loadBalances();
  }, []);

  // Calculate total USD value from backend balances
  const totalUsdFromBackend = useMemo(() => {
    // TODO: You'll need price data to calculate USD value
    // For now, return the wallet.totalUsd as fallback
    return wallet.totalUsd;
  }, [backendBalances, wallet.totalUsd]);

  // Convert backend balances to Asset format for display
  const assetsFromBackend = useMemo(() => {
    if (!backendBalances || backendBalances.length === 0) {
      return wallet.assets;
    }

    return backendBalances.map((balance) => {
      const amount = parseFloat(balance.balance) / Math.pow(10, balance.decimals);
      // TODO: Calculate USD value with real price data
      const value = amount * (balance.symbol === "ETH" ? 1800 : 1); // Mock prices
      
      return {
        symbol: balance.symbol,
        name: balance.symbol === "ETH" ? "Ether" : balance.symbol,
        amount,
        value,
      };
    });
  }, [backendBalances, wallet.assets]);

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
          {wallet.totalUsd.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-4 mb-16">
        {/* Deposit */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group"
            >
              <ArrowDownLeft className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
              Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0A] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Deposit Funds</DialogTitle>
              <DialogDescription className="text-white/60">
                Add funds to your Void Wallet account.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center text-white/40 text-sm">
              Deposit functionality coming soon.
            </div>
          </DialogContent>
        </Dialog>

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

        <SendTokenDialog />

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

                    return (
                      <motion.div
                        key={asset.symbol}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                            {asset.symbol[0]}
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
            <div className="text-center py-20 text-white/20 text-sm">
              No transaction history found.
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

function SendTokenDialog() {
  const { address, chainId } = useAccount();
  const [selectedTokenId, setSelectedTokenId] = useState(SEPOLIA_TOKENS[0].id);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const isOnSepolia = chainId === sepolia.id;
  const erc20Tokens = useMemo(
    () => SEPOLIA_TOKENS.filter((token) => token.type === "erc20"),
    []
  );

  const { data: nativeBalance, isLoading: isNativeLoading } = useBalance({
    address,
    chainId: sepolia.id,
    query: {
      enabled: Boolean(address && isOnSepolia),
      refetchInterval: 15_000,
    },
  });

  const { data: erc20BalancesData, isLoading: isErc20Loading } =
    useReadContracts({
      contracts:
        address && isOnSepolia
          ? erc20Tokens.map((token) => ({
              address: token.address!,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [address],
              chainId: sepolia.id,
            }))
          : [],
      query: {
        enabled: Boolean(address && isOnSepolia && erc20Tokens.length),
        refetchInterval: 20_000,
      },
    });

  const tokenBalances: TokenWithBalance[] = useMemo(() => {
    return SEPOLIA_TOKENS.map((token) => {
      if (!address || !isOnSepolia) {
        return {
          ...token,
          balanceRaw: 0n,
          formattedBalance: "0",
          isBalanceLoading: false,
        };
      }

      if (token.type === "native") {
        const raw = nativeBalance?.value ?? 0n;
        return {
          ...token,
          balanceRaw: raw,
          formattedBalance: formatTokenBalance(raw, token.decimals),
          isBalanceLoading: isNativeLoading,
        };
      }

      const erc20Index = erc20Tokens.findIndex(
        (erc20Token) => erc20Token.id === token.id
      );
      const erc20Result = erc20BalancesData?.[erc20Index];
      const raw =
        erc20Result && erc20Result.status === "success"
          ? ((erc20Result.result ?? 0n) as bigint)
          : 0n;

      return {
        ...token,
        balanceRaw: raw,
        formattedBalance: formatTokenBalance(raw, token.decimals),
        isBalanceLoading: isErc20Loading || !erc20Result,
      };
    });
  }, [
    address,
    erc20BalancesData,
    erc20Tokens,
    isErc20Loading,
    isNativeLoading,
    isOnSepolia,
    nativeBalance?.value,
  ]);

  const selectedToken =
    tokenBalances.find((token) => token.id === selectedTokenId) ??
    tokenBalances[0];

  const isWalletDisconnected = !address;
  const needsNetworkSwitch = Boolean(address && !isOnSepolia);

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
          selectedToken.address || "0x0000000000000000000000000000000000000000",
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
      onOpenChange={(open) => {
        if (open) {
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
            Switch your wallet network to Sepolia to load balances.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40 px-1">
                <span>Available tokens</span>
                <span className="text-[10px] text-white/50 tracking-[0.3em]">
                  Live balance
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tokenBalances.map((token) => {
                  const isSelected = selectedTokenId === token.id;
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
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                          {token.symbol[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {token.symbol}
                          </div>
                          <div className="text-xs text-white/40">
                            {token.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right min-w-[90px]">
                        {token.isBalanceLoading ? (
                          <div className="h-4 w-20 bg-white/10 rounded-full animate-pulse ml-auto" />
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-white">
                              {token.formattedBalance}
                            </div>
                            <div className="text-xs text-white/40">
                              {token.symbol}
                            </div>
                          </>
                        )}
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
                  Balance: {selectedToken?.formattedBalance}{" "}
                  {selectedToken?.symbol}
                </div>
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
                disabled={isSending || !recipientAddress || !amount}
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
