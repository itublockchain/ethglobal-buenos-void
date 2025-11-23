"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useAccount,
  useSignMessage,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { concat, getBytes, keccak256 } from "ethers";
import { getLatestTransactionProof } from "@/lib/emergency-withdraw";
import {
  VOID_CONTRACT_ADDRESS,
  VOID_CONTRACT_ABI,
} from "@/components/WalletDashboard/constants";
import { Asset } from "@/components/WalletDashboard/types";
import { TokenSelector } from "@/components/WalletDashboard/ui/TokenSelector";
import { fetchWalletBalances } from "@/lib/balance";

interface EmergencyExitDialogProps {
  tokens: Asset[];
  onSuccess?: () => Promise<void> | void;
}

export function EmergencyExitDialog({
  tokens,
  onSuccess,
}: EmergencyExitDialogProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [open, setOpen] = useState(false);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<
    Address | undefined
  >();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [proof, setProof] = useState<string[] | null>(null);
  const hasCalledOnSuccessRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  // Keep onSuccess ref up to date
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const selectedToken = tokens.find(
    (t) => t.address?.toLowerCase() === selectedTokenAddress?.toLowerCase()
  );

  // Load proof from localStorage when dialog opens
  useEffect(() => {
    if (open) {
      const latestProof = getLatestTransactionProof();
      if (latestProof) {
        setProof(latestProof);
      }
    }
  }, [open]);

  // Write contract for emergency withdraw
  const {
    writeContract,
    data: hash,
    isPending: isWithdrawPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isWithdrawSuccess } =
    useWaitForTransactionReceipt({
      hash,
      chainId: baseSepolia.id,
    });

  // Handle sign message
  const handleSignMessage = async () => {
    if (!signMessageAsync || !address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setIsSigning(true);
      setError(null);

      const message = "Reveal my public key";
      const signedMessage = await signMessageAsync({ message });

      // Slice first 130 characters as per user's code
      const sig = signedMessage.slice(0, 130);
      setSignature(sig);

      // Calculate nonce from signature
      const signatureBytes = getBytes(sig);
      const nonceValue = keccak256(signatureBytes);
      setNonce(nonceValue);
    } catch (err) {
      console.error("Failed to sign message:", err);
      setError(err instanceof Error ? err.message : "Failed to sign message");
    } finally {
      setIsSigning(false);
    }
  };

  // Handle emergency withdraw
  const handleEmergencyWithdraw = async () => {
    if (!selectedToken || !withdrawAmount || !nonce || !proof || !address) {
      setError("Please fill all fields and sign the message first");
      return;
    }

    try {
      setError(null);

      const tokenAddress =
        selectedToken.address === "0x0000000000000000000000000000000000000000"
          ? "0x0000000000000000000000000000000000000000"
          : (selectedToken.address as Address);

      const decimals = selectedToken.symbol === "ETH" ? 18 : 6;
      const amount = parseUnits(withdrawAmount, decimals);

      // Ensure nonce is in bytes32 format (0x prefix + 64 hex chars)
      let nonceBytes32: `0x${string}`;
      if (nonce.startsWith("0x")) {
        // Remove 0x if it exists, then pad to 64 chars, then add 0x back
        const hexWithoutPrefix = nonce.slice(2);
        if (hexWithoutPrefix.length === 64) {
          nonceBytes32 = nonce as `0x${string}`;
        } else if (hexWithoutPrefix.length < 64) {
          nonceBytes32 = `0x${hexWithoutPrefix.padStart(
            64,
            "0"
          )}` as `0x${string}`;
        } else {
          // If longer, take first 64 chars
          nonceBytes32 = `0x${hexWithoutPrefix.slice(0, 64)}` as `0x${string}`;
        }
      } else {
        // No 0x prefix, pad to 64 chars and add prefix
        const padded = nonce.padStart(64, "0").slice(0, 64);
        nonceBytes32 = `0x${padded}` as `0x${string}`;
      }

      // Ensure proof siblings are in bytes32 format
      const proofBytes32: `0x${string}`[] = proof.map((sibling) => {
        if (typeof sibling !== "string") {
          throw new Error("Proof sibling must be a string");
        }

        let hexString: string;

        if (sibling.startsWith("0x")) {
          // Already has 0x prefix, remove it for processing
          hexString = sibling.slice(2);
        } else {
          // Check if it's a decimal BigInt string or hex without prefix
          // Try to parse as BigInt to see if it's decimal
          try {
            const bigIntValue = BigInt(sibling);
            // Convert BigInt to hex (without 0x prefix)
            hexString = bigIntValue.toString(16);
          } catch {
            // If it's not a valid BigInt, assume it's already hex
            hexString = sibling;
          }
        }

        // Ensure hex string is exactly 64 characters (32 bytes)
        if (hexString.length === 64) {
          return `0x${hexString}` as `0x${string}`;
        } else if (hexString.length < 64) {
          // Pad with zeros on the left
          return `0x${hexString.padStart(64, "0")}` as `0x${string}`;
        } else {
          // Take first 64 characters if longer
          return `0x${hexString.slice(0, 64)}` as `0x${string}`;
        }
      });

      writeContract({
        address: VOID_CONTRACT_ADDRESS,
        abi: VOID_CONTRACT_ABI,
        functionName: "emergencyWithdrawWithInclusive",
        args: [amount, tokenAddress, nonceBytes32, proofBytes32],
        chainId: baseSepolia.id,
      });
    } catch (err) {
      console.error("Emergency withdraw failed:", err);
      setError(
        err instanceof Error ? err.message : "Emergency withdraw failed"
      );
    }
  };

  // Handle withdraw success - refresh and close modal
  useEffect(() => {
    if (isWithdrawSuccess && !hasCalledOnSuccessRef.current) {
      hasCalledOnSuccessRef.current = true;

      // Wait 3 seconds for backend to process the withdraw before refreshing
      const backendProcessTimer = setTimeout(() => {
        // Call success callback to refresh balances
        if (onSuccessRef.current) {
          Promise.resolve(onSuccessRef.current()).catch((err) =>
            console.error("Failed to refresh after emergency withdraw:", err)
          );
        }
      }, 3000);

      // Close modal after delay
      const closeTimer = setTimeout(() => {
        setOpen(false);
        // Reset state after closing
        const resetTimer = setTimeout(() => {
          setSelectedTokenAddress(undefined);
          setWithdrawAmount("");
          setError(null);
          setSignature(null);
          setNonce(null);
          setProof(null);
          hasCalledOnSuccessRef.current = false;
        }, 300);
        return () => clearTimeout(resetTimer);
      }, 4500);

      return () => {
        clearTimeout(backendProcessTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isWithdrawSuccess]);

  // Update error from write contract
  useEffect(() => {
    if (writeError) {
      setError(
        writeError instanceof Error
          ? writeError.message
          : "Emergency withdraw transaction failed"
      );
    }
  }, [writeError]);

  const canProceed = useMemo(() => {
    return (
      selectedToken &&
      withdrawAmount &&
      parseFloat(withdrawAmount) > 0 &&
      signature &&
      nonce &&
      proof &&
      proof.length > 0
    );
  }, [selectedToken, withdrawAmount, signature, nonce, proof]);

  const maxAmount = selectedToken?.amount || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-10 px-4 text-sm uppercase tracking-wider text-white hover:bg-zinc-900 hover:cursor-pointer border border-white/20"
        >
          Emergency Exit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-black border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Emergency Exit
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Use this in case of emergency to withdraw your funds directly from
            the contract
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Select Token
            </label>
            <TokenSelector
              tokens={tokens.map((token) => ({
                address: token.address || "",
                symbol: token.symbol,
                formattedBalance: token.amount.toString(),
                logo: token.logo,
              }))}
              selectedTokenAddress={selectedTokenAddress}
              onSelect={(address) =>
                setSelectedTokenAddress(address as Address)
              }
            />
          </div>

          {/* Amount Input */}
          {selectedToken && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Amount
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white pr-20"
                  step="any"
                  min="0"
                  max={maxAmount.toString()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs text-white/60 hover:text-white"
                  onClick={() => setWithdrawAmount(maxAmount.toString())}
                >
                  MAX
                </Button>
              </div>
              <p className="text-xs text-white/40">
                Available: {maxAmount.toLocaleString()} {selectedToken.symbol}
              </p>
            </div>
          )}

          {/* Sign Message Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Step 1: Sign Message
            </label>
            {!signature ? (
              <Button
                onClick={handleSignMessage}
                disabled={isSigning}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10"
              >
                {isSigning ? "Signing..." : "Sign Message"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">
                  Message signed successfully
                </span>
              </div>
            )}
            {nonce && (
              <p className="text-xs text-white/40 break-all">
                Nonce: {nonce.slice(0, 20)}...
              </p>
            )}
          </div>

          {/* Proof Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Step 2: Proof Status
            </label>
            {proof && proof.length > 0 ? (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">
                  Proof loaded from localStorage ({proof.length} siblings)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-500">
                  No proof found in localStorage
                </span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Emergency Withdraw Button */}
          <Button
            onClick={handleEmergencyWithdraw}
            disabled={!canProceed || isWithdrawPending || isConfirming}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawPending || isConfirming
              ? "Processing..."
              : isWithdrawSuccess
              ? "Success!"
              : "Emergency Withdraw"}
          </Button>

          {isWithdrawSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md"
            >
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">
                Emergency withdraw successful!
              </span>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
