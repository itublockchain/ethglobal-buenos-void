"use client";

import { useState } from "react";
import { WalletDashboard } from "@/components/WalletDashboard";

const DEMO_ACCOUNT_DATA = {
  id: "demo-1",
  name: "Void Wallet Demo",
  address: "0xD62E688A272f19e60E826f746bE26a41F2475A32",
  totalUsd: 2971.16,
  assets: [
    {
      symbol: "USDC",
      name: "USD Coin",
      amount: 23.242,
      value: 23.24,
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
    {
      symbol: "ROSE",
      name: "Oasis Network",
      amount: 15236.31,
      value: 240.58,
      address: "0x0000000000000000000000000000000000000001",
    },
    {
      symbol: "WETH",
      name: "Wrapped Ether",
      amount: 1.504,
      value: 2707.34,
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
  ],
};

export default function DemoDashboard() {
  return (
    <main className="flex min-h-screen w-full bg-black text-white overflow-hidden font-sans selection:bg-white/20">
      {/* Demo Mode Banner */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-200 text-xs font-medium pointer-events-none">
        🎨 DEMO MODE - No wallet connection required
      </div>

      {/* MAIN CONTENT */}
      <section className="flex-1 flex flex-col relative bg-black">
        {/* Navbar / Top Section */}
        <header className="flex items-center justify-between px-12 py-8 z-20 relative">
          <div className="text-xl font-bold tracking-[0.2em] uppercase text-white">
            Void Wallet
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-white/60">
              Demo Address: {DEMO_ACCOUNT_DATA.address.slice(0, 6)}...
              {DEMO_ACCOUNT_DATA.address.slice(-4)}
            </div>
          </div>
        </header>

        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-black to-black pointer-events-none" />

        <div className="flex-1 px-12 max-w-5xl mx-auto w-full z-10 flex flex-col">
          <WalletDashboard wallet={DEMO_ACCOUNT_DATA} />
        </div>
      </section>
    </main>
  );
}

