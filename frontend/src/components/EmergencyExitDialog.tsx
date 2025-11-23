"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { BalanceProof } from "@/lib/balance";
import {
  VOID_CONTRACT_ADDRESS,
  VOID_CONTRACT_ABI,
} from "@/components/WalletDashboard/constants";
import { Asset } from "@/components/WalletDashboard/types";
import { TokenSelector } from "@/components/WalletDashboard/ui/TokenSelector";

interface EmergencyExitDialogProps {
  tokens: Asset[];
  onSuccess?: () => Promise<void> | void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmergencyExitDialog({
  tokens,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EmergencyExitDialogProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<
    Address | undefined
  >();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [nonce, setNonce] = useState<string | null>(null);
  const [proof, setProof] = useState<BalanceProof | null>(null);
  const hasCalledOnSuccessRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  // Keep onSuccess ref up to date
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const selectedToken = tokens.find(
    (t) => t.address?.toLowerCase() === selectedTokenAddress?.toLowerCase()
  );

  // Load proof from localStorage when dialog opens or token changes
  useEffect(() => {
    if (open) {
      // Clear error when dialog opens
      setError(null);
      if (selectedTokenAddress) {
        // Get the actual token address (handle native token)
        const tokenAddress =
          selectedTokenAddress === "0x0000000000000000000000000000000000000000"
            ? "0x0000000000000000000000000000000000000000"
            : selectedTokenAddress;

        console.log(
          `🚀 [Emergency Exit] Loading proof for token: ${tokenAddress}`
        );
        console.log(
          `🔍 [Emergency Exit] Selected token address: ${selectedTokenAddress}`
        );

        const latestProof = getLatestTransactionProof(tokenAddress);

        // Accept proof even if siblings array is empty - the contract might handle it
        if (latestProof !== null) {
          console.log(
            `✅ [Emergency Exit] Proof loaded successfully with ${
              latestProof.siblings?.length || 0
            } siblings`
          );
          setProof(latestProof);
          // Clear any previous error when proof is loaded successfully
          setError(null);
        } else {
          console.log(
            `❌ [Emergency Exit] No proof found for token: ${tokenAddress}`
          );
          setProof(null);
        }
      } else {
        // If dialog is open but no token selected, clear proof
        console.log(`⚠️ [Emergency Exit] Dialog open but no token selected`);
        setProof(null);
      }
    }
  }, [open, selectedTokenAddress]);

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

      const message = "Void Wallet Balances Secret";
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

      // Get siblings array from proof object
      const proofSiblings = proof.siblings || [];

      // Ensure proof siblings are in bytes32 format
      const proofBytes32: `0x${string}`[] = proofSiblings.map((sibling) => {
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
      proof !== null
    );
  }, [selectedToken, withdrawAmount, signature, nonce, proof]);

  const maxAmount = selectedToken?.amount || 0;

  // Automatically set amount to maximum when token is selected
  useEffect(() => {
    if (selectedToken && maxAmount > 0) {
      setWithdrawAmount(maxAmount.toString());
    }
  }, [selectedToken, maxAmount]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-4 text-sm uppercase tracking-wider text-white hover:bg-zinc-900 hover:cursor-pointer border border-white/20"
          >
            Emergency Exit
          </Button>
        </DialogTrigger>
      )}
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
              onSelect={(address) => {
                setSelectedTokenAddress(address as Address);
                // Clear error when token is selected
                setError(null);
              }}
            />
            {selectedToken && (
              <div className="mt-3">
                <p className="text-sm text-white/80">
                  Amount:{" "}
                  <span className="font-medium text-white">
                    {maxAmount.toLocaleString()} {selectedToken.symbol}
                  </span>
                </p>
                <p className="text-xs text-white/60 italic mt-1">
                  Amount automatically set to maximum for emergency withdrawal
                </p>
              </div>
            )}
          </div>

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
            {proof !== null ? (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">
                  Proof loaded from localStorage ({proof.siblings?.length || 0}{" "}
                  siblings)
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
