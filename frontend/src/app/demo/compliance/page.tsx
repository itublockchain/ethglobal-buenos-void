"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSignMessage } from "wagmi";
import { PublicWallet } from "@/components/PublicWallet";
import { Settings, CheckCircle2, Copy, Check } from "lucide-react";
import { hashMessage, keccak256, concat, getBytes, toBeHex } from "ethers";
import {
  createLowerProof,
  verifyProof as verifyProofAPI,
  deserializePublicInputsFromProof,
} from "@/hooks/useCreateLowerProof";
import { createTransferKey } from "@/lib/utils";

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
  const [proofData, setProofData] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Proof Verify states
  const [verifyReceiver, setVerifyReceiver] = useState("");
  const [verifyAmount, setVerifyAmount] = useState("");
  const [verifyTokenAddress, setVerifyTokenAddress] = useState("");
  const [verifyThreshold, setVerifyThreshold] = useState("");
  const [verifyProof, setVerifyProof] = useState("");
  const [verifyProofData, setVerifyProofData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );

  const walletAddress = address || "0x...";

  // Check if all required fields are filled for proof generation
  const isFormValid =
    receiver.trim() !== "" &&
    amount.trim() !== "" &&
    tokenAddress.trim() !== "" &&
    threshold.trim() !== "";

  const handleCopyProof = async () => {
    if (proof) {
      try {
        await navigator.clipboard.writeText(proof);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleGenerateProof = async () => {
    if (!isConnected || !address || !signMessageAsync) {
      return;
    }

    // If proof already exists, don't generate again
    if (proof) {
      return;
    }

    // If signature exists, require all fields to be filled for proof generation
    if (signature && !isFormValid) {
      return;
    }

    try {
      setIsSigning(true);

      // If signature doesn't exist, create it first
      if (!signature) {
        const message = "Void Wallet Transfers Secret";
        const signedMessage = await signMessageAsync({ message });
        setSignature(signedMessage);
        setIsSigning(false);
      } else {
        // If signature exists, generate proof
        setIsGenerating(true);
        setIsSigning(false);

        try {
          const message = "Void Wallet Transfers Secret";
          const hashed_message = hashMessage(message);

          // Create values array - using threshold as base value
          const thresholdValue = BigInt(
            Math.floor(parseFloat(threshold) * 1e18 || 0)
          );
          const values = Array.from(
            { length: 10 },
            (_, i) => thresholdValue + BigInt(i * 5)
          );
          const pairwise_value = BigInt(
            Math.floor(parseFloat(amount) * 1e18 || 0)
          );

          // Create transfer key
          const key = createTransferKey(
            address,
            receiver,
            tokenAddress,
            signature
          );

          // Create combined values for leaf hash - FIXED: Check if values is an array
          const combinedValuesArray = Array.isArray(values)
            ? values
                .map((v) => {
                  const hex = v.toString(16).padStart(64, "0");
                  return Array.from(getBytes(`0x${hex}`));
                })
                .flat()
            : [];

          const combinedValues = Uint8Array.from(combinedValuesArray);

          const combined = concat([
            getBytes(key),
            combinedValues,
            toBeHex(1n, 32),
          ]);
          const leaf_hash = keccak256(combined);

          // Generate proof
          const proofResult = await createLowerProof(
            values,
            leaf_hash,
            pairwise_value,
            signature,
            hashed_message,
            address,
            receiver,
            tokenAddress
          );
          console.log("Generated proof:", proofResult);

          setProofData(proofResult);
          setProof(JSON.stringify(proofResult, null, 2));
        } catch (error) {
          console.error("Failed to generate proof:", error);
          alert(
            "Failed to generate proof. Please check the console for details."
          );
        } finally {
          setIsGenerating(false);
        }
      }
    } catch (error) {
      console.error("Failed to sign message:", error);
    } finally {
      if (!signature) {
        setIsSigning(false);
      }
    }
  };

  const handleVerifyProof = async () => {
    if (!verifyProof.trim()) {
      alert("Please paste a proof to verify");
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult(null);

      let proofObj;
      try {
        proofObj = JSON.parse(verifyProof);
      } catch (parseError) {
        console.error("Parse error:", parseError);
        throw new Error("Invalid proof format - must be valid JSON");
      }

      // Deserialize public inputs to fill the form fields
      try {
        const publicInputs = deserializePublicInputsFromProof(
          proofObj.publicInputs
        );

        // Fill the verification form fields
        setVerifyReceiver(publicInputs.countryparty_address || "");
        setVerifyAmount(
          publicInputs.pairwise_value
            ? (Number(publicInputs.pairwise_value) / 1e18).toString()
            : ""
        );
        setVerifyTokenAddress(publicInputs.token_address || "");

        // Calculate threshold from the pairwise_value (approximate)
        const thresholdApprox = publicInputs.pairwise_value
          ? (Number(publicInputs.pairwise_value) / 1e18).toString()
          : "";
        setVerifyThreshold(thresholdApprox);
      } catch (deserializeError) {
        console.error("Deserialization error:", deserializeError);
        // Continue with verification even if deserialization fails
      }

      console.log("Verifying proof:", proofObj);

      const isValid = await verifyProofAPI(proofObj);
      console.log("Verification result:", isValid);

      setVerificationResult(isValid);
      setVerifyProofData(proofObj);
    } catch (error) {
      console.error("Failed to verify proof:", error);
      alert(
        `Verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setVerificationResult(false);
    } finally {
      setIsVerifying(false);
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
          <div className="text-2xl font-bold tracking-wider">VOID WALLET</div>
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
              <div className="pb-3 text-sm font-semibold text-white relative tracking-tight flex items-center gap-2">
                Proof Generate
                <Settings className="w-4 h-4 text-white/60" />
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-[0.15em] text-white/70 font-medium">
                      Proof
                    </label>
                    {proof && (
                      <Button
                        onClick={handleCopyProof}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-white/10"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={proof}
                    disabled
                    placeholder="Will be generated after clicking Generate Proof"
                    className="w-full min-h-[120px] bg-white/[0.03] border border-white/10 text-white/90 placeholder:text-white/20 focus:bg-white/[0.08] focus:border-white/30 rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-mono text-xs p-3 resize-none"
                  />
                </div>

                {/* Generate Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleGenerateProof}
                    disabled={
                      !isConnected ||
                      isSigning ||
                      isGenerating ||
                      !!proof ||
                      (!!signature && !isFormValid)
                    }
                    className="h-11 px-8 bg-white/[0.05] hover:bg-white hover:text-black border border-white/15 hover:border-white transition-all duration-300 text-xs uppercase tracking-[0.2em] font-semibold group relative overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">
                      {isSigning || isGenerating
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
              <div className="pb-3 text-sm font-semibold text-white relative tracking-tight flex items-center gap-2">
                Proof Verify
                <CheckCircle2 className="w-4 h-4 text-green-500" />
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
                  <textarea
                    value={verifyProof}
                    onChange={(e) => setVerifyProof(e.target.value)}
                    placeholder="Paste proof JSON here..."
                    className="w-full min-h-[120px] bg-white/[0.03] border border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 font-mono text-xs hover:border-white/15 p-3 resize-none"
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
                    placeholder="Auto-filled from proof"
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
                    placeholder="Auto-filled from proof"
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
                    placeholder="Auto-filled from proof"
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
                    placeholder="Auto-filled from proof"
                    className="h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-white/30 rounded-none transition-all duration-200 hover:border-white/15 text-xs"
                  />
                </div>

                {/* Verification Result */}
                {verificationResult !== null && (
                  <div
                    className={`p-3 rounded-none border ${
                      verificationResult
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    <div className="text-xs font-medium">
                      {verificationResult
                        ? "✓ Proof is valid"
                        : "✗ Proof is invalid"}
                    </div>
                  </div>
                )}

                {/* Verify Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleVerifyProof}
                    disabled={!verifyProof.trim() || isVerifying}
                    className="h-11 px-8 bg-white/[0.05] hover:bg-white hover:text-black border border-white/15 hover:border-white transition-all duration-300 text-xs uppercase tracking-[0.2em] font-semibold group relative overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">
                      {isVerifying ? "Verifying..." : "Verify Proof"}
                    </span>
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
