import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getTokenLogoUrl } from "@/lib/utils";
import { useTimeAgo } from "../hooks/useTimeAgo";
import { WalletTransaction } from "@/lib/transactions";
import { TokenBalance } from "@/lib/balance";

interface TransactionRowProps {
    tx: WalletTransaction;
    tokenBalances: TokenBalance[];
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ tx, tokenBalances }) => {
    const isOutgoing = tx.type === "sent" || tx.type === "withdraw";
    const Icon = isOutgoing ? ArrowUpRight : ArrowDownLeft;
    const iconColor = isOutgoing ? "text-red-400" : "text-green-400";

    let typeLabel = "Unknown";
    if (tx.type === "sent") typeLabel = "Sent";
    else if (tx.type === "received") typeLabel = "Received";
    else if (tx.type === "deposit") typeLabel = "Deposit";
    else if (tx.type === "withdraw") typeLabel = "Withdraw";

    const tokenInfo = tokenBalances.find((b) => b.token.toLowerCase() === tx.token.toLowerCase());
    const matchingToken = tokenInfo?.symbol || "UNKNOWN";

    const timeAgo = useTimeAgo(tx.timestamp);

    const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Icon className={`${iconColor} w-5 h-5`} />
                </div>
                <div>
                    <div className="font-bold text-white text-sm">
                        {typeLabel}
                    </div>
                    <div className="text-xs text-white/40">
                        {isOutgoing ? "To" : "From"} {truncate(isOutgoing ? tx.receiver : tx.sender)}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="font-medium text-white text-sm">
                    {isOutgoing ? "-" : "+"}{parseFloat(tx.amount).toFixed(4)} {matchingToken}
                </div>
                <div className="text-xs text-white/40">{timeAgo}</div>
            </div>
        </motion.div>
    );
};
