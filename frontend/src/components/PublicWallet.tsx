"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from "wagmi";
import { clearAuthToken } from "@/lib/sign/auth";

function truncateAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function PublicWallet({ isAppLoading }: { isAppLoading: boolean }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? undefined,
  });
  const avatarUrl = typeof ensAvatar === "string" ? ensAvatar : "/vitalik.png";

  const shouldShowAvatar = Boolean(avatarUrl);

  const handleDisconnect = () => {
    clearAuthToken();
    disconnect();
  };

  return (
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
  );
}
