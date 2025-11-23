import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Copy, Check } from "lucide-react";
import { WalletTransaction } from "@/lib/transactions";
import { TokenBalance } from "@/lib/balance";
import { SUPPORTED_TOKENS } from "./constants";
import { useState } from "react";

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
                    <div className="text-white text-lg font-medium">No transactions found</div>
                </div>
            )}

            {/* Transaction List */}
            {!isLoading && !error && hasTransactions && (
                <div className="space-y-2">
                    {transactions.map((tx, i) => {
                        const isSent = tx.type === "sent";
                        const Icon = isSent ? ArrowUpRight : ArrowDownLeft;
                        const iconColor = isSent ? "text-red-400" : "text-green-400";

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
                        const now = Date.now();
                        const diffMs = now - txTimestamp;
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

                        const displayAddress = isSent ? tx.receiver : tx.sender;
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
                                            {isSent ? "Sent" : "Received"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <span>
                                                {isSent ? "To" : "From"}{" "}
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
                                        {isSent ? "-" : "+"}
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
