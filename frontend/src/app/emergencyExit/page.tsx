"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { EmergencyExitDialog } from "@/components/EmergencyExitDialog";
import { fetchWalletBalances } from "@/lib/balance";
import { AlertTriangle } from "lucide-react";

export default function EmergencyExitPage() {
  const { isConnected, address } = useAccount();
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const loadTokens = async () => {
      if (!isConnected || !address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const balanceData = await fetchWalletBalances(true);
        const assets = balanceData.balances.map((balance) => ({
          symbol:
            balance.symbol ||
            (balance.token === "0x0000000000000000000000000000000000000000"
              ? "ETH"
              : "UNKNOWN"),
          name:
            balance.symbol === "ETH"
              ? "Ether"
              : balance.symbol || "Unknown Token",
          amount: parseFloat(balance.balance) || 0,
          value: 0,
          address: balance.token,
        }));
        setTokens(assets);
      } catch (err: any) {
        console.error("Failed to load tokens:", err);
        setError(err.message || "Failed to load wallet balances");
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <main className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please connect your wallet first</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px] animate-flow-1" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] animate-flow-2" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-6">
        {isLoading ? (
          <div className="text-white/60">Loading...</div>
        ) : error ? (
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold mb-2">Emergency Exit</h1>
              <p className="text-white/60 max-w-md">
                Use this in case of emergency to withdraw your funds directly
                from the contract
              </p>
            </div>

            <Button
              onClick={() => setDialogOpen(true)}
              size="lg"
              className="h-16 px-12 text-lg font-semibold rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all duration-300 hover:scale-105"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency Exit
            </Button>

            <EmergencyExitDialog
              tokens={tokens}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSuccess={async () => {
                // Refresh tokens after emergency withdraw
                try {
                  const balanceData = await fetchWalletBalances(true);
                  const assets = balanceData.balances.map((balance) => ({
                    symbol:
                      balance.symbol ||
                      (balance.token ===
                      "0x0000000000000000000000000000000000000000"
                        ? "ETH"
                        : "UNKNOWN"),
                    name:
                      balance.symbol === "ETH"
                        ? "Ether"
                        : balance.symbol || "Unknown Token",
                    amount: parseFloat(balance.balance) || 0,
                    value: 0,
                    address: balance.token,
                  }));
                  setTokens(assets);
                } catch (error) {
                  console.error("Failed to refresh tokens:", error);
                }
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}
