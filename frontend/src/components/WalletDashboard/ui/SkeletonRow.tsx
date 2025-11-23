import { motion } from "framer-motion";
import React from "react";

interface SkeletonRowProps {
    height?: string; // e.g. "h-4"
    width?: string; // e.g. "w-20"
    className?: string;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ height = "h-4", width = "w-20", className = "" }) => (
    <motion.div
        className={`bg-white/10 animate-pulse rounded ${height} ${width} ${className}`}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
    />
);
