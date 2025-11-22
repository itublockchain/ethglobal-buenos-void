"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { truncateAddress } from "@/lib/utils";
import { useEnsAvatar, useEnsName } from "wagmi";

interface PublicWalletCardProps {
  address?: string;
  isLoading?: boolean;
  onDisconnect: () => void;
}

export function PublicWalletCard({
  address,
  isLoading = false,
  onDisconnect,
}: PublicWalletCardProps) {
  const { data: ensName } = useEnsName({ address: address as `0x${string}` });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
  });
  
  const avatarUrl = typeof ensAvatar === "string" ? ensAvatar : undefined;
  const [avatarTimedOut, setAvatarTimedOut] = useState(false);

  useEffect(() => {
    setAvatarTimedOut(false);
    if (ensAvatar) {
      return;
    }
    const timer = setTimeout(() => setAvatarTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [address, ensAvatar]);

  const shouldShowAvatar = Boolean(avatarUrl && !avatarTimedOut);

  return (
    <div className="w-full max-w-[320px]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4 font-medium text-right">
        Public Wallet
      </div>
      <Card className="relative bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-10 w-10 rounded-full bg-white/5 animate-pulse" />
            <div className="h-4 w-32 bg-white/10 rounded-full animate-pulse" />
            <div className="h-3 w-16 bg-white/10 rounded-full animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-500 p-[1px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                  {shouldShowAvatar && (
                    <img
                      src={avatarUrl}
                      alt="Wallet avatar"
                      className="w-full h-full object-cover rounded-full"
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
              onClick={onDisconnect}
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

