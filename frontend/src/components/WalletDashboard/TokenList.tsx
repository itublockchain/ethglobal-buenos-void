import { motion } from "framer-motion";
import { getTokenLogoUrl } from "@/lib/utils";
import { Asset } from "./types";

interface TokenListProps {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;
  totalUsd: number;
}

export function TokenList({
  assets,
  isLoading,
  error,
  totalUsd,
}: TokenListProps) {
  const hasAssets = assets && Array.isArray(assets) && assets.length > 0;
  const isEmpty =
    !isLoading &&
    !error &&
    (!assets || !Array.isArray(assets) || assets.length === 0);

  return (
    <div className="space-y-2">
      {/* List Header - Only show when there are tokens */}
      {!isLoading && !error && hasAssets && (
        <div className="flex items-center justify-between text-xs text-white/40 px-4 pb-2">
          <span>Token name</span>
          <span>Portfolio %</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
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
      {error && !isLoading && (
        <div className="text-center py-12 text-red-400 text-sm">{error}</div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-20">
          <div className="text-white text-lg font-medium">No tokens found</div>
        </div>
      )}

      {/* List Items */}
      {!isLoading && !error && hasAssets && (
        <div className="space-y-2">
          {assets.map((asset, i) => {
            // Calculate portfolio percentage, handle division by zero and NaN
            const portfolioPercentage = 
              totalUsd > 0 && !isNaN(totalUsd) && !isNaN(asset.value)
                ? (asset.value / totalUsd) * 100
                : 0;

            // Prioritize asset.logo from Alchemy, fallback to getTokenLogoUrl
            const logoUrl =
              asset.logo ||
              (asset.address ? getTokenLogoUrl(asset.address) : "");

            return (
              <motion.div
                key={asset.address || `token-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden ${
                      !logoUrl ? "bg-white/10" : ""
                    }`}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={asset.symbol}
                        className="w-full h-full object-contain bg-transparent"
                        onError={(e) => {
                          // If image fails to load, hide it and show fallback
                          e.currentTarget.style.display = "none";
                          const parent = e.currentTarget.parentElement!;
                          parent.innerText = asset.symbol?.[0] ?? "?";
                          parent.className =
                            "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold overflow-hidden";
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
  );
}
