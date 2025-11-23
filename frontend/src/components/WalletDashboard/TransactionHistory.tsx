import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Copy, Check } from "lucide-react";
import { WalletTransaction } from "@/lib/transactions";
import { TokenBalance } from "@/lib/balance";
import { SUPPORTED_TOKENS, VOID_CONTRACT_ADDRESS } from "./constants";
import { useState, useEffect } from "react";

interface TransactionHistoryProps {
    transactions: WalletTransaction[];
    isLoading: boolean;
    error: string | null;
    tokenBalances: TokenBalance[];
}

export function TransactionHistory({
    transactions,
    isLoading,
    error,
    tokenBalances,
}: TransactionHistoryProps) {
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    const copyToClipboard = async (address: string) => {
        try {
            await navigator.clipboard.writeText(address);
            setCopiedAddress(address);
            setTimeout(() => setCopiedAddress(null), 2000);
        } catch (err) {
            console.error("Failed to copy address:", err);
        }
    };

    const hasTransactions = transactions && Array.isArray(transactions) && transactions.length > 0;
    const isEmpty = !isLoading && !error && (!transactions || !Array.isArray(transactions) || transactions.length === 0);

    // Calculate current time using state to avoid impure function calls during render
    // Update every minute to keep "time ago" accurate
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        // Update immediately when transactions change
        setCurrentTime(Date.now());

        // Update every minute to keep time display accurate
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000); // Update every 60 seconds

        return () => {
            clearInterval(interval);
        };
    }, [transactions]);

    return (
        <div className="space-y-2">
            {/* List Header - Only show when there are transactions */}
            {!isLoading && !error && hasTransactions && (
                <div className="flex items-center justify-between text-xs text-white/40 px-4 pb-2">
                    <span>Activity</span>
                    <span>Time</span>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
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
            {error && !isLoading && (
                <div className="text-center py-12 text-red-400 text-sm">{error}</div>
            )}

            {/* Empty State */}
            {isEmpty && (
                <div className="text-center py-20">
                    <div className="text-white text-lg font-medium">No transfer found</div>
                </div>
            )}

            {/* Transaction List */}
            {!isLoading && !error && hasTransactions && (
                <div className="space-y-2">
                    {transactions.map((tx, i) => {
                        // Check if transaction involves the contract address
                        const isContractReceiver = tx.receiver?.toLowerCase() === VOID_CONTRACT_ADDRESS?.toLowerCase();
                        const isContractSender = tx.sender?.toLowerCase() === VOID_CONTRACT_ADDRESS?.toLowerCase();

                        let typeLabel = "Unknown";
                        // Priority: Check contract address first to determine deposit/withdraw
                        // If sender is contract, it's a deposit (money going into the wallet from contract)
                        if (isContractSender) {
                            typeLabel = "Deposit";
                        }
                        // If receiver is contract, it's a withdraw (money going out of the wallet to contract)
                        else if (isContractReceiver) {
                            typeLabel = "Withdraw";
                        }
                        // Otherwise use the original type
                        else if (tx.type === "sent") typeLabel = "Sent";
                        else if (tx.type === "received") typeLabel = "Received";
                        else if (tx.type === "deposit") typeLabel = "Deposit";
                        else if (tx.type === "withdraw") typeLabel = "Withdraw";

                        // Determine if transaction is outgoing based on typeLabel
                        // Deposit is incoming (money into wallet), Withdraw is outgoing (money out of wallet)
                        const isOutgoing = typeLabel === "Withdraw" || typeLabel === "Sent";
                        const Icon = isOutgoing ? ArrowUpRight : ArrowDownLeft;
                        const iconColor = isOutgoing ? "text-red-400" : "text-green-400";

                        // Find token info
                        const tokenInfo = tokenBalances.find(
                            (b) => b.token.toLowerCase() === tx.token.toLowerCase()
                        );
                        const matchingToken = SUPPORTED_TOKENS.find(
                            (t) => t.address?.toLowerCase() === tx.token.toLowerCase()
                        );

                        const tokenSymbol =
                            matchingToken?.symbol || tokenInfo?.symbol || "UNKNOWN";

                        // Format timestamp
                        const txTimestamp =
                            typeof tx.timestamp === "string"
                                ? parseInt(tx.timestamp)
                                : tx.timestamp;
                        const diffMs = currentTime - txTimestamp;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);

                        let timeAgo = "";
                        if (diffMins < 1) {
                            timeAgo = "Just now";
                        } else if (diffMins < 60) {
                            timeAgo = `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
                        } else if (diffHours < 24) {
                            timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
                        } else {
                            timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
                        }

                        // Truncate addresses for display
                        const truncateAddress = (addr: string) =>
                            `${addr.slice(0, 6)}...${addr.slice(-4)}`;

                        const displayAddress = isOutgoing ? tx.receiver : tx.sender;
                        const isCopied = copiedAddress === displayAddress;

                        return (
                            <motion.div
                                key={`${tx.sender}-${tx.receiver}-${tx.timestamp}-${i}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-colors group relative"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <Icon className={`w-5 h-5 ${iconColor}`} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">
                                            {typeLabel}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <span>
                                                {isOutgoing ? "To" : "From"}{" "}
                                                {truncateAddress(displayAddress)}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    copyToClipboard(displayAddress);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white/60 active:text-white/80 p-1 rounded"
                                                title="Copy address"
                                                type="button"
                                            >
                                                {isCopied ? (
                                                    <Check className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-white text-sm">
                                        {isOutgoing ? "-" : "+"}
                                        {parseFloat(tx.amount).toFixed(4)} {tokenSymbol}
                                    </div>
                                    <div className="text-xs text-white/40">{timeAgo}</div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
