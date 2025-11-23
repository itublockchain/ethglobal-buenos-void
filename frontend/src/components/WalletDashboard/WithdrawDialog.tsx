import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
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
} from "wagmi";
import { type Address } from "viem";
import { getTokenLogoUrl } from "@/lib/utils";
import { withdrawFromWallet } from "@/lib/wallet";

import { TokenSelector } from "./ui/TokenSelector";
import { Asset } from "./types";

export function WithdrawDialog({
  tokens,
  onSuccess,
}: {
  tokens: Asset[];
  onSuccess?: () => Promise<void> | void;
}) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<
    Address | undefined
  >();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasCalledOnSuccessRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  // Keep onSuccess ref up to date
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const selectedToken = tokens.find(
    (t) => t.address?.toLowerCase() === selectedTokenAddress?.toLowerCase()
  );

  // Withdraw state
  const [isWithdrawPending, setIsWithdrawPending] = useState(false);
  const [isWithdrawSuccess, setIsWithdrawSuccess] = useState(false);

  // Handle withdraw success - refresh and close modal
  useEffect(() => {
    if (isWithdrawSuccess && !hasCalledOnSuccessRef.current) {
      hasCalledOnSuccessRef.current = true;

      // Wait 3 seconds for backend to process the withdraw before refreshing
      const backendProcessTimer = setTimeout(() => {
        // Call success callback to refresh balances
        if (onSuccessRef.current) {
          Promise.resolve(onSuccessRef.current()).catch((err) =>
            console.error("Failed to refresh after withdraw:", err)
          );
        }
      }, 3000);

      // Close modal after delay
      const closeTimer = setTimeout(() => {
        setOpen(false);
        // Reset state after closing
        const resetTimer = setTimeout(() => {
          setCurrentStep(1);
          setSelectedTokenAddress(undefined);
          setWithdrawAmount("");
          setError(null);
          setIsWithdrawSuccess(false);
          hasCalledOnSuccessRef.current = false; // Reset flag
        }, 300);
        return () => clearTimeout(resetTimer);
      }, 4500); // Extended to 4.5s to close after backend processing

      return () => {
        clearTimeout(backendProcessTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isWithdrawSuccess]);

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!selectedToken || !withdrawAmount) {
      setError("Lütfen token ve miktar seçin");
      return;
    }

    try {
      setError(null);
      setIsWithdrawPending(true);
      setIsWithdrawSuccess(false);

      const tokenAddress = selectedToken.address || "0x0000000000000000000000000000000000000000";

      const result = await withdrawFromWallet(withdrawAmount, tokenAddress);

      if (result.txHash) {
        console.log("Withdraw Transaction Hash:", result.txHash);
      }

      setIsWithdrawSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw başarısız");
      setIsWithdrawSuccess(false);
    } finally {
      setIsWithdrawPending(false);
    }
  };

  const parsedAmount = useMemo(() => {
    const n = parseFloat(withdrawAmount);
    return Number.isFinite(n) ? n : 0;
  }, [withdrawAmount]);

  const isInsufficientBalance = selectedToken ? parsedAmount > selectedToken.amount : false;

  // Convert tokens to TokenSelector format
  const tokensForSelector = useMemo(() => {
    return tokens.map((t) => ({
      address: (t.address || "0x0000000000000000000000000000000000000000") as Address,
      symbol: t.symbol,
      formattedBalance: t.amount.toString(),
      logo: t.logo,
    }));
  }, [tokens]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          // Reset transaction states when opening modal
          setIsWithdrawPending(false);
          setIsWithdrawSuccess(false);
          hasCalledOnSuccessRef.current = false;
        } else {
          // Reset on close
          setTimeout(() => {
            setCurrentStep(1);
            setSelectedTokenAddress(undefined);
            setWithdrawAmount("");
            setError(null);
            setIsWithdrawPending(false);
            setIsWithdrawSuccess(false);
            hasCalledOnSuccessRef.current = false;
          }, 200);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
        >
          <ArrowUpRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#050505]/90 backdrop-blur-xl border border-white/10 text-white max-w-md p-0 gap-0 overflow-hidden shadow-2xl shadow-black/80">
        <DialogHeader className="p-8 pb-6 border-b border-white/5">
          <DialogTitle className="text-2xl font-light tracking-wide text-white">
            Withdraw Funds
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-medium mt-2">
            Withdraw assets from your Void Wallet
          </DialogDescription>
        </DialogHeader>

        {!address ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20 border border-white/5">
              <ArrowUpRight className="w-8 h-8" />
            </div>
            <p className="text-white/60 text-sm font-light">
              Please connect your wallet to continue.
            </p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20 border border-white/5">
              <ArrowUpRight className="w-8 h-8" />
            </div>
            <p className="text-white/60 text-sm font-light">
              No tokens available to withdraw.
            </p>
          </div>
        ) : (
          <div className="flex flex-col max-h-[600px]">
            {/* Progress Steps - Premium */}
            <div className="px-10 py-4 border-b border-white/5 bg-white/[0.01]">
              <div className="relative flex items-center justify-between">
                {/* Connecting Line Background */}
                <div className="absolute left-0 top-[15px] w-full h-[2px] bg-white/5 z-0 rounded-full" />

                {/* Active Line Progress */}
                <motion.div
                  className="absolute left-0 top-[15px] h-[2px] bg-gradient-to-r from-white/40 to-white z-0 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width: currentStep === 1 ? "0%" : "100%",
                  }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                />

                {[1, 2].map((step) => {
                  const isActive = currentStep >= step;
                  const isCompleted = currentStep > step;
                  const isCurrent = currentStep === step;

                  return (
                    <div
                      key={step}
                      className="relative z-10 flex flex-col items-center gap-2"
                    >
                      <motion.div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border backdrop-blur-md ${isActive
                          ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                          : "bg-black/40 text-white/20 border-white/10"
                          }`}
                        animate={{
                          scale: isCurrent ? 1.08 : 1,
                          y: isCurrent ? -1 : 0,
                        }}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : step}
                      </motion.div>
                      <span
                        className={`text-[9px] uppercase tracking-[0.2em] font-medium transition-colors duration-300 ${isCurrent ? "text-white" : "text-white/20"
                          }`}
                      >
                        {step === 1 ? "Select" : "Confirm"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-left relative">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full flex flex-col"
              >
                {/* Step 1: Select Token & Amount */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold ml-1">
                        Select Asset
                      </label>
                      <TokenSelector
                        tokens={tokensForSelector}
                        selectedTokenAddress={selectedTokenAddress}
                        onSelect={(addr) =>
                          setSelectedTokenAddress(addr as Address)
                        }
                        isLoading={false}
                      />
                    </div>

                    <div
                      className={`space-y-4 transition-all duration-500 ${selectedToken
                        ? "opacity-100 translate-y-0"
                        : "opacity-30 translate-y-4 pointer-events-none blur-sm"
                        }`}
                    >
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">
                          Amount
                        </label>
                        {selectedToken && (
                          <button
                            onClick={() =>
                              setWithdrawAmount(selectedToken.amount.toString())
                            }
                            className="text-[10px] bg-white/10 hover:bg-white text-white hover:text-black px-3 py-1 rounded-full transition-all uppercase tracking-wider font-medium"
                          >
                            Max: {selectedToken.amount}
                          </button>
                        )}
                      </div>

                      <div className="relative group">
                        <Input
                          placeholder="0.00"
                          type="text"
                          value={withdrawAmount}
                          onChange={(e) => {
                            // Only allow numbers and decimals
                            if (/^\d*\.?\d*$/.test(e.target.value)) {
                              setWithdrawAmount(e.target.value);
                            }
                          }}
                          className="h-20 bg-black/40 border border-white/10 focus:border-white/50 focus:bg-black/60 text-4xl font-light pl-6 pr-20 rounded-2xl transition-all placeholder:text-white/30 text-white shadow-inner"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-medium text-white/30 pointer-events-none">
                          {selectedToken?.symbol || ""}
                        </div>
                      </div>

                      {isInsufficientBalance && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-400 flex items-center gap-2 px-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          Insufficient balance
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Confirm Withdraw */}
                {currentStep === 2 && (
                  <div className="flex flex-col h-full justify-start items-center text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                      className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    >
                      <ArrowUpRight className="w-8 h-8" />
                    </motion.div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-light text-white tracking-wide">
                        Confirm Withdraw
                      </h3>
                      <p className="text-sm text-white/50 max-w-[280px] mx-auto leading-relaxed">
                        You are about to withdraw{" "}
                        <span className="text-white font-medium">
                          {withdrawAmount} {selectedToken?.symbol}
                        </span>{" "}
                        from your Void Wallet to your connected wallet.
                      </p>
                    </div>

                    <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-white/40 uppercase tracking-wider text-xs">
                          Asset
                        </span>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const logoUrl = selectedToken
                              ? selectedToken.logo ||
                              getTokenLogoUrl(selectedToken.address!)
                              : "";
                            return (
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] overflow-hidden ${!logoUrl ? "bg-white/10" : ""
                                  }`}
                              >
                                {logoUrl ? (
                                  <img
                                    src={logoUrl}
                                    alt={selectedToken?.symbol}
                                    className="w-full h-full object-contain bg-transparent"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const parent =
                                        e.currentTarget.parentElement!;
                                      parent.textContent =
                                        selectedToken?.symbol[0] || "?";
                                      parent.className =
                                        "w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] overflow-hidden";
                                    }}
                                  />
                                ) : (
                                  selectedToken?.symbol[0]
                                )}
                              </div>
                            );
                          })()}
                          <span className="font-bold text-white text-sm">
                            {selectedToken?.symbol}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-[1px] bg-white/5 mb-2" />
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-white/40 uppercase tracking-wider text-xs">
                          Recipient
                        </span>
                        <span className="font-mono text-white/60 text-xs bg-white/5 px-2 py-1 rounded">
                          {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                      </div>
                      <div className="w-full h-[1px] bg-white/5 mb-2" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40 uppercase tracking-wider text-xs">
                          Total Amount
                        </span>
                        <span className="font-mono text-lg text-white">
                          {withdrawAmount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 pt-4 border-t border-white/5 bg-[#050505]/50 backdrop-blur-md relative z-20">
              {/* Status Messages */}
              <div className="absolute -top-10 left-0 w-full px-6 flex justify-center pointer-events-none">
                {error &&
                  !isWithdrawSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-lg shadow-red-900/20"
                    >
                      {error}
                    </motion.div>
                  )}
                {isWithdrawSuccess && currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <Check className="w-3 h-3" />
                    Withdrawn successfully! Closing...
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Reset transaction states when going back
                      setError(null);
                      setIsWithdrawPending(false);
                      setCurrentStep(1);
                    }}
                    disabled={isWithdrawPending}
                    className="h-12 px-6 text-white/40 hover:text-white hover:bg-white/5 uppercase tracking-widest text-xs font-medium rounded-none"
                  >
                    Back
                  </Button>
                )}

                <Button
                  className="flex-1 h-12 bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs font-bold disabled:opacity-50 disabled:hover:scale-100 rounded-none shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:bg-white/10 disabled:text-white/20 disabled:shadow-none"
                  onClick={() => {
                    if (currentStep === 1) {
                      setCurrentStep(2);
                    } else if (currentStep === 2) {
                      handleWithdraw();
                    }
                  }}
                  disabled={
                    (currentStep === 1 &&
                      (!selectedToken ||
                        !withdrawAmount ||
                        isInsufficientBalance ||
                        parsedAmount <= 0)) ||
                    isWithdrawPending ||
                    isWithdrawSuccess
                  }
                >
                  {currentStep === 1
                    ? "Continue"
                    : isWithdrawPending
                      ? "Withdrawing..."
                      : "Confirm Withdraw"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
