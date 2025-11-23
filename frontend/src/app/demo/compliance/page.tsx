"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSignMessage } from "wagmi";
import { PublicWallet } from "@/components/PublicWallet";

export default function CompliancePage() {
  const { open } = useAppKit();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAppLoading] = useState(false);

  // Proof Generate states
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [threshold, setThreshold] = useState("");
  const [signature, setSignature] = useState("");
  const [proof, setProof] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  // Proof Verify states
  const [verifyReceiver, setVerifyReceiver] = useState("");
  const [verifyAmount, setVerifyAmount] = useState("");
  const [verifyTokenAddress, setVerifyTokenAddress] = useState("");
  const [verifyThreshold, setVerifyThreshold] = useState("");
  const [verifyProof, setVerifyProof] = useState("");

  const walletAddress = address || "0x...";

  const handleGenerateProof = async () => {
    if (!isConnected || !address || !signMessageAsync) {
      return;
    }

    try {
      setIsSigning(true);

      // If signature doesn't exist, create it first
      if (!signature) {
        const message = "Void Wallet Transfers Secret";
        const signedMessage = await signMessageAsync({ message });
        setSignature(signedMessage);
      } else {
        // If signature exists, generate mock proof
        const mockHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;
        setProof(mockHash);
      }
    } catch (error) {
      console.error("Failed to sign message:", error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-black text-white overflow-hidden font-sans relative">
      {/* Background Grid Pattern */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Navbar */}
      <header className="flex items-center justify-between px-12 py-6 z-20 relative border-b border-white/10">
        <div className="flex items-center">
          <Image
            src="/VoidWallet.svg"
            alt="Void Wallet"
            width={280}
            height={60}
            className="h-10 w-auto"
          />
        </div>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <PublicWallet isAppLoading={isAppLoading} />
          ) : (
            <Button
              onClick={() => open({ view: "Connect" })}
              className="h-10 px-6 bg-white/5 hover:bg-white hover:text-black border border-white/10 hover:border-white transition-all text-sm uppercase tracking-wider font-medium"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex pt-6 px-8 gap-6 relative z-10">
        {/* Left Section - Proof Generate */}
        <div className="flex-1">
          <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            {/* Top edge glow */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
            {/* Tab Header */}
            <div className="flex items-center gap-8 border-b border-white/10 mb-6 pb-2 relative">
              <div className="pb-3 text-sm font-semibold text-white relative tracking-tight">
                Proof Generate
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white via-white/80 to-white" />
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px] relative z-10">
              <div className="space-y-5">
                {/* Sender */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Sender
                  </label>
                  <Input
                    type="text"
                    value={walletAddress}
                    disabled
                    className="h-11 bg-white/[0.03] border-white/10 text-white/90 placeholder:text-white/20 focus:bg-white/[0.08] focus:border-white/30 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono text-xs"
                  />
                </div>

                {/* Receiver */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Receiver
                  </label>
                  <Input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="0x..."
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 font-mono text-xs hover:border-white/15"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Amount
                  </label>
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        setAmount(e.target.value);
                      }
                    }}
                    placeholder="0.00"
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 hover:border-white/15 text-xs"
                  />
                </div>

                {/* Token Address */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Token Address
                  </label>
                  <Input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 font-mono text-xs hover:border-white/15"
                  />
                </div>

                {/* Threshold */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Threshold
                  </label>
                  <Input
                    type="text"
                    value={threshold}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        setThreshold(e.target.value);
                      }
                    }}
                    placeholder="Amount threshold for compliance check"
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 hover:border-white/15 text-xs"
                  />
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Signature
                  </label>
                  <Input
                    type="text"
                    value={signature}
                    disabled
                    placeholder="Will be generated after signing"
                    className="h-11 bg-white/[0.03] border-white/10 text-white/90 placeholder:text-white/20 focus:bg-white/[0.08] focus:border-white/30 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono text-xs"
                  />
                </div>

                {/* Proof */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Proof
                  </label>
                  <Input
                    type="text"
                    value={proof}
                    disabled
                    placeholder="Will be generated after clicking Generate Proof"
                    className="h-11 bg-white/[0.03] border-white/10 text-white/90 placeholder:text-white/20 focus:bg-white/[0.08] focus:border-white/30 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono text-xs"
                  />
                </div>

                {/* Generate Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleGenerateProof}
                    disabled={!isConnected || isSigning}
                    className="h-11 px-8 bg-white/[0.05] hover:bg-white hover:text-black border border-white/15 hover:border-white transition-all duration-300 text-xs uppercase tracking-[0.2em] font-semibold group relative overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">
                      {isSigning
                        ? signature
                          ? "Generating..."
                          : "Signing..."
                        : signature
                        ? "Generate Proof"
                        : "Create Signature"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Proof Verify */}
        <div className="flex-1">
          <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            {/* Top edge glow */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* Tab Header */}
            <div className="flex items-center gap-8 border-b border-white/10 mb-6 pb-2 relative">
              <div className="pb-3 text-sm font-semibold text-white relative tracking-tight">
                Proof Verify
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white via-white/80 to-white" />
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px] relative z-10">
              <div className="space-y-5">
                {/* Sender */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Sender
                  </label>
                  <Input
                    type="text"
                    value={walletAddress}
                    disabled
                    className="h-11 bg-white/[0.03] border-white/10 text-white/90 placeholder:text-white/20 focus:bg-white/[0.08] focus:border-white/30 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono text-xs"
                  />
                </div>

                {/* Proof */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Proof
                  </label>
                  <Input
                    type="text"
                    value={verifyProof}
                    onChange={(e) => setVerifyProof(e.target.value)}
                    placeholder="Paste proof here..."
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 font-mono text-xs hover:border-white/15"
                  />
                </div>

                {/* Receiver */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Receiver
                  </label>
                  <Input
                    type="text"
                    value={verifyReceiver}
                    onChange={(e) => setVerifyReceiver(e.target.value)}
                    placeholder="0x..."
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 font-mono text-xs hover:border-white/15"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Amount
                  </label>
                  <Input
                    type="text"
                    value={verifyAmount}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        setVerifyAmount(e.target.value);
                      }
                    }}
                    placeholder="0.00"
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 hover:border-white/15 text-xs"
                  />
                </div>

                {/* Token Address */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Token Address
                  </label>
                  <Input
                    type="text"
                    value={verifyTokenAddress}
                    onChange={(e) => setVerifyTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 font-mono text-xs hover:border-white/15"
                  />
                </div>

                {/* Threshold */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                    Threshold
                  </label>
                  <Input
                    type="text"
                    value={verifyThreshold}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        setVerifyThreshold(e.target.value);
                      }
                    }}
                    placeholder="Amount threshold for compliance check"
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 hover:border-white/15 text-xs"
                  />
                </div>

                {/* Verify Button */}
                <div className="flex justify-end pt-4">
                  <Button className="h-11 px-8 bg-white/[0.05] hover:bg-white hover:text-black border border-white/15 hover:border-white transition-all duration-300 text-xs uppercase tracking-[0.2em] font-semibold group relative overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                    <span className="relative z-10">Verify Proof</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
