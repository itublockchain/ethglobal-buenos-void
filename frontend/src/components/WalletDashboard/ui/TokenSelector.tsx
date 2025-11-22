import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTokenLogoUrl } from "@/lib/utils";
import React from "react";

interface TokenItem {
    address: string;
    symbol: string;
    formattedBalance: string;
    // any extra fields you need
}

interface TokenSelectorProps {
    tokens: TokenItem[];
    selectedTokenAddress?: string;
    onSelect: (address: string) => void;
    // optional search – for DepositDialog we don't need it, but we keep the prop for reuse
    searchable?: boolean;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
    tokens,
    selectedTokenAddress,
    onSelect,
    searchable = false,
}) => {
    const [searchQuery, setSearchQuery] = React.useState("");

    const filtered = React.useMemo(() => {
        if (!searchable || !searchQuery) return tokens;
        const q = searchQuery.toLowerCase();
        return tokens.filter(
            (t) => t.symbol.toLowerCase().includes(q) || t.address.toLowerCase().includes(q)
        );
    }, [tokens, searchQuery, searchable]);

    return (
        <div className="space-y-4">
            {searchable && (
                <div className="relative">
                    <Input
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 pl-10 bg-white/5 border-white/10 text-sm text-white placeholder:text-white/20 rounded-xl focus:bg-white/10"
                    />
                </div>
            )}
            <div className="grid gap-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                        <span className="text-sm text-white/40 font-light">No assets found</span>
                    </div>
                ) : (
                    filtered.map((token) => {
                        const isSelected = selectedTokenAddress === token.address;
                        const logoUrl = getTokenLogoUrl(token.address);
                        return (
                            <motion.button
                                key={token.address}
                                onClick={() => onSelect(token.address)}
                                whileHover={{ scale: 1.01, backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)" }}
                                whileTap={{ scale: 0.99 }}
                                className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group ${isSelected
                                    ? "bg-white/10 border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                                    : "bg-white/5 border-white/5 text-white hover:border-white/20"
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${!logoUrl ? "bg-white/10" : ""}`}>
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={token.symbol}
                                                className="w-full h-full object-contain bg-transparent"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                    const parent = e.currentTarget.parentElement!;
                                                    parent.textContent = token.symbol[0];
                                                }}
                                            />
                                        ) : (
                                            token.symbol[0]
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm tracking-wide">{token.symbol}</div>
                                        <div className="text-xs text-white/40">Balance: {token.formattedBalance}</div>
                                    </div>
                                </div>
                                {isSelected && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
                                        <Check className="w-3 h-3" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })
                )}
            </div>
        </div>
    );
};
