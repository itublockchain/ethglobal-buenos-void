"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Network, Sparkles } from "lucide-react";
import {
  useAccount,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
  useSwitchChain,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { clearAuthToken } from "@/lib/sign/auth";

function truncateAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PublicWallet({ isAppLoading }: { isAppLoading: boolean }) {
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
  });
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isOnMainnet = chainId === mainnet.id;
  const avatarUrl =
    typeof ensAvatar === "string" ? ensAvatar : "/vitalik.png";
  const [avatarTimedOut, setAvatarTimedOut] = useState(false);

  useEffect(() => {
    setAvatarTimedOut(false);
    if (ensAvatar) {
      return;
    }
    const timer = setTimeout(() => setAvatarTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [address, ensAvatar]);

  const shouldShowAvatar = Boolean(avatarUrl);
  const networkButtonLabel = isSwitching
    ? "Switching..."
    : isOnMainnet
    ? "Ethereum"
    : "Switch to Ethereum";

  const networkBadgeClass = isOnMainnet
    ? "border-emerald-400/30 text-emerald-200/90 bg-emerald-400/5"
    : "border-white/30 text-white/80 bg-white/5";

  const handleSwitchToMainnet = () => {
    if (!switchChain || isOnMainnet) {
      return;
    }
    switchChain({ chainId: mainnet.id });
  };

  const handleDisconnect = () => {
    clearAuthToken();
    disconnect();
  };

  return (
    <div className="flex items-center gap-4">
      {!isAppLoading && (
        <Button
          type="button"
          variant="outline"
          onClick={handleSwitchToMainnet}
          disabled={isOnMainnet || !address || isSwitching}
          className={`flex flex-col items-center justify-center gap-1 rounded-none border border-white/15 bg-black/30 px-4 py-3 text-center text-white/80 hover:bg-white hover:text-black transition-all min-w-[160px] ${
            isOnMainnet ? "cursor-default opacity-90" : "cursor-pointer"
          }`}
        >
          <div
            className={`flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] ${
              isOnMainnet ? "text-emerald-200" : "text-white/70"
            }`}
          >
            {isOnMainnet ? (
              <Sparkles className="w-3 h-3 text-emerald-300" />
            ) : (
              <Network className="w-3 h-3" />
            )}
            {isOnMainnet ? "Ethereum" : "Switch"}
          </div>
          <span className="text-[11px] text-white/50 tracking-[0.15em] text-center">
            {isOnMainnet
              ? "Connected"
              : isSwitching
              ? "Switching..."
              : "Tap to switch"}
          </span>
        </Button>
      )}
      <Card className="relative bg-[#0A0A0A] border border-white/10 p-4 min-w-[280px]">
        {isAppLoading ? (
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded bg-white/5 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-white/10 rounded-full animate-pulse" />
              <div className="h-3 w-16 bg-white/10 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-zinc-600 to-zinc-500 p-[1px]">
                <div className="w-full h-full rounded bg-black flex items-center justify-center overflow-hidden">
                  {shouldShowAvatar && (
                    <img
                      src={avatarUrl}
                      alt="Wallet avatar"
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {truncateAddress(address)}
                </div>
                <div className="text-xs text-white/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Connected
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleDisconnect}
              className="absolute bottom-3 right-3 text-white/70 hover:text-red-400 cursor-pointer transition-colors duration-150 rounded-full border border-transparent hover:border-red-400/40 hover:bg-white/5 p-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
