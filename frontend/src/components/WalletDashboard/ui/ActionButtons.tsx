import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepositDialog } from "../DepositDialog";
import { SendTokenDialog } from "../SendTokenDialog";

interface ActionButtonsProps {
    onDepositSuccess: () => Promise<void> | void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onDepositSuccess }) => {
    return (
        <div className="grid grid-cols-4 gap-4 mb-16">
            {/* Deposit */}
            <DepositDialog onSuccess={onDepositSuccess} />

            {/* Withdraw (placeholder) */}
            <Button
                variant="outline"
                className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
            >
                <ArrowUpRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                Withdraw
            </Button>

            {/* Send */}
            <SendTokenDialog tokens={[]} onSuccess={onDepositSuccess} />

            {/* Swap (placeholder) */}
            <Button
                variant="outline"
                className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
            >
                <ArrowLeftRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                Swap
            </Button>
        </div>
    );
};
