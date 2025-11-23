import React from "react";
import { motion } from "framer-motion";

interface BalanceHeaderProps {
    totalUsd: number;
}

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({ totalUsd }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-12"
        >
            <h2 className="text-white/40 text-sm uppercase tracking-widest mb-2">
                Total Balance
            </h2>
            <div className="text-7xl font-bold tracking-tighter text-white font-mono">
                ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </motion.div>
    );
};
