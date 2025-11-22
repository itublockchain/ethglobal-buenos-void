"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { PublicWallet } from "@/components/PublicWallet";
import { SignMessageSection } from "@/components/SignMessageSection";
import { WalletDashboard } from "@/components/WalletDashboard";

const ACCOUNT_DATA = {
  id: "1",
  name: "Void Wallet",
  address: "0x...", // This will be replaced by actual connected address
  totalUsd: 2730.58,
  assets: [
    { symbol: "ETH", name: "Ether", amount: 1.504, value: 2707.34 },
    { symbol: "USDC", name: "USDC", amount: 23.242, value: 23.24 },
  ],
};

export default function Dashboard() {
  const router = useRouter();
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // Check user profile after signing
  const handleSignSuccess = async () => {
    setIsSigned(true);

    try {
      const userProfile = await fetchUserProfile();

      // If required array is not empty, redirect to onboarding
      if (userProfile.required && userProfile.required.length > 0) {
        router.push("/onboarding");
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const walletData = {
    ...ACCOUNT_DATA,
    address: address || ACCOUNT_DATA.address,
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen w-full bg-black text-white grid place-items-center">
        <div className="w-full max-w-md space-y-6 text-center px-4">
          <div className="text-xs uppercase tracking-[0.7em] text-white/40">
            Void Wallet
          </div>
          <Button
            onClick={() => open({ view: "Connect" })}
            className="w-full h-14 text-base uppercase tracking-wider text-white hover:bg-zinc-900 hover:cursor-pointer border border-white/20"
            variant="outline"
          >
            Connect Wallet
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full bg-black text-white overflow-hidden font-sans selection:bg-white/20">
      {/* RIGHT MAIN CONTENT */}
      <section className="flex-1 flex flex-col relative bg-black">
        {/* Navbar / Top Section */}
        <header className="flex items-center justify-between px-12 py-8 z-20 relative">
          <div className="text-xl font-bold tracking-[0.2em] uppercase text-white">
            Void Wallet
          </div>
          <PublicWallet isAppLoading={isAppLoading} />
        </header>

        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-black to-black pointer-events-none" />

        <div
          className={`flex-1 px-12 max-w-5xl mx-auto w-full z-10 flex flex-col ${
            !isSigned ? "pt-20" : ""
          }`}
        >
          {isAppLoading ? (
            <div className="space-y-6 w-full">
              <div className="h-6 w-48 bg-white/10 rounded-full animate-pulse" />
              <div className="h-32 bg-white/5 rounded-[32px] animate-pulse" />
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`action-skeleton-${index}`}
                    className="h-14 rounded-xl bg-white/5 animate-pulse"
                  />
                ))}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`asset-skeleton-${index}`}
                    className="h-20 rounded-2xl bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {!isSigned && (
                <SignMessageSection
                  address={address}
                  onSuccess={handleSignSuccess}
                />
              )}

              {isSigned && <WalletDashboard wallet={walletData} />}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
