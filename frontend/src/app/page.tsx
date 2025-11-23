"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { PublicWallet } from "@/components/PublicWallet";
import { SignMessageSection } from "@/components/SignMessageSection";
import { WalletDashboard } from "@/components/WalletDashboard";
import { NotificationMock } from "@/components/NotificationMock";
import {
  readPersistedAuthToken,
  validateTokenWallet,
  clearAuthToken,
} from "@/lib/sign/auth";

export default function Dashboard() {
  const router = useRouter();
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setIsSigned(false);
      return;
    }

    const checkAuth = async () => {
      const token = readPersistedAuthToken();
      if (!token) {
        setTimeout(() => setIsAppLoading(false), 700);
        return;
      }

      // Validate token wallet address matches connected address
      if (address && !validateTokenWallet(token, address)) {
        console.warn(
          "Token wallet address does not match connected wallet. Clearing token..."
        );
        clearAuthToken();
        setIsSigned(false);
        setTimeout(() => setIsAppLoading(false), 700);
        return;
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;
        if (!baseUrl) throw new Error("Base URL missing");

        const response = await fetch(`${baseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.data?.required_secrets?.length > 0) {
              router.push("/onboarding");
              return;
            } else {
              setIsSigned(true);
            }
          }
        } else {
          // If token is invalid, remove it so user can sign again
          clearAuthToken();
          setIsSigned(false);
        }
      } catch (error) {
        console.error("Auto-login failed:", error);
        clearAuthToken();
        setIsSigned(false);
      } finally {
        setTimeout(() => setIsAppLoading(false), 700);
      }
    };

    checkAuth();
  }, [router, isConnected, address]);

  // Check user profile after signing
  const handleSignSuccess = async () => {
    setIsAppLoading(true); // Show loading while checking profile

    try {
      const token = readPersistedAuthToken();
      const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;

      if (!token || !baseUrl) {
        setIsAppLoading(false);
        return;
      }

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const data = await response.json();

      // If required array is not empty, redirect to onboarding
      if (data.success && data.data?.required_secrets?.length > 0) {
        router.push("/onboarding");
        // Do not set isSigned to true here to prevent dashboard flash
      } else {
        // Only show dashboard if no required secrets
        setIsSigned(true);
        setIsAppLoading(false);
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      setIsAppLoading(false);
    }
  };

  const walletData = {
    id: "1",
    name: "Void Wallet",
    address: address || "0x...",
    totalUsd: 0,
    assets: [],
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen w-full bg-black text-white grid place-items-center">
        <div className="w-full max-w-md space-y-6 text-center px-4">
          <div className="flex justify-center items-center opacity-60">
            <Image
              src="/VoidWallet.svg"
              alt="Void Wallet"
              width={600}
              height={130}
              className="h-32 w-auto"
            />
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
          <div className="flex items-center">
            <Image
              src="/VoidWallet.svg"
              alt="Void Wallet"
              width={280}
              height={60}
              className="h-12 w-auto"
            />
          </div>
          <div className="flex items-center gap-4">
            <NotificationMock />
            <PublicWallet isAppLoading={isAppLoading} />
          </div>
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
