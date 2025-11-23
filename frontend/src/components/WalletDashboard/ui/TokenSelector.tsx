import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTokenLogoUrl } from "@/lib/utils";
import React from "react";

interface TokenItem {
    address: string;
    symbol: string;
    formattedBalance: string;
    logo?: string;
    // any extra fields you need
}

interface TokenSelectorProps {
    tokens: TokenItem[];
    selectedTokenAddress?: string;
    onSelect: (address: string) => void;
    // optional search – for DepositDialog we don't need it, but we keep the prop for reuse
    searchable?: boolean;
    isLoading?: boolean;
    sharpCorners?: boolean;
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
    tokens,
    selectedTokenAddress,
    onSelect,
    searchable = false,
    isLoading = false,
    sharpCorners = false,
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
                        className={`h-12 pl-10 bg-white/5 border-white/10 text-sm text-white placeholder:text-white/20 focus:bg-white/10 ${sharpCorners ? "rounded-none" : "rounded-xl"}`}
                    />
                </div>
            )}
            <div className="grid gap-3">
                {isLoading ? (
                    <>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between p-4 bg-white/5 border border-white/5 animate-pulse ${sharpCorners ? "rounded-none" : "rounded-2xl"}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-16 bg-white/10 rounded" />
                                        <div className="h-3 w-24 bg-white/10 rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                ) : filtered.length === 0 ? (
                    <div className={`text-center py-10 border border-dashed border-white/10 bg-white/[0.02] ${sharpCorners ? "rounded-none" : "rounded-2xl"}`}>
                        <span className="text-sm text-white/40 font-light">No assets found</span>
                    </div>
                ) : (
                    filtered.map((token) => {
                        const isSelected = selectedTokenAddress === token.address;
                        // Prioritize Alchemy logo, fallback to getTokenLogoUrl
                        const logoUrl = token.logo || getTokenLogoUrl(token.address);
                        const fallbackLogoUrl = token.logo ? getTokenLogoUrl(token.address) : "";

                        return (
                            <motion.button
                                key={token.address}
                                onClick={() => onSelect(token.address)}
                                whileHover={{ scale: 1.01, backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)" }}
                                whileTap={{ scale: 0.99 }}
                                className={`relative flex items-center justify-between p-4 border transition-all duration-300 group ${sharpCorners ? "rounded-none" : "rounded-2xl"} ${isSelected
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
                                                    // Try fallback URL if primary fails
                                                    if (fallbackLogoUrl && e.currentTarget.src !== fallbackLogoUrl) {
                                                        e.currentTarget.src = fallbackLogoUrl;
                                                    } else {
                                                        // If all fails, show symbol initial
                                                        e.currentTarget.style.display = "none";
                                                        const parent = e.currentTarget.parentElement!;
                                                        parent.textContent = token.symbol[0];
                                                        parent.className = "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden";
                                                    }
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
