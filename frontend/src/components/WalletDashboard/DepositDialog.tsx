import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, Check } from "lucide-react";
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
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, formatUnits, parseUnits, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { getTokenLogoUrl } from "@/lib/utils";
import { usePublicWalletTokens } from "@/hooks/usePublicWalletTokens";

import { VOID_CONTRACT_ADDRESS, VOID_CONTRACT_ABI } from "./constants";
import { TokenSelector } from "./ui/TokenSelector";

export function DepositDialog({
  onSuccess,
}: {
  onSuccess?: () => Promise<void> | void;
}) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<
    Address | undefined
  >();
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasCalledOnSuccessRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  // Keep onSuccess ref up to date
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const {
    tokens: publicWalletTokens,
    isLoading: isTokensLoading,
    error: tokensError,
    refresh: refreshTokens,
  } = usePublicWalletTokens();

  useEffect(() => {
    if (open && address) {
      refreshTokens();
    }
  }, [open, address, refreshTokens]);

  const selectedToken = publicWalletTokens.find(
    (t) => t.address === selectedTokenAddress
  );

  // Approve transaction
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Deposit transaction
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    error: depositError,
    reset: resetDeposit,
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    });

  // Handle approve success - move to step 3
  useEffect(() => {
    if (isApproveSuccess && currentStep === 2) {
      setTimeout(() => {
        setCurrentStep(3);
        setError(null);
      }, 0);
    }
  }, [isApproveSuccess, currentStep]);

  // Handle deposit success - refresh and close modal
  useEffect(() => {
    if (isDepositSuccess && !hasCalledOnSuccessRef.current) {
      hasCalledOnSuccessRef.current = true;

      // Wait 3 seconds for backend to process the deposit before refreshing
      const backendProcessTimer = setTimeout(() => {
        // Call success callback to refresh balances
        if (onSuccessRef.current) {
          Promise.resolve(onSuccessRef.current()).catch((err) =>
            console.error("Failed to refresh after deposit:", err)
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
          setDepositAmount("");
          setError(null);
          hasCalledOnSuccessRef.current = false; // Reset flag
        }, 300);
        return () => clearTimeout(resetTimer);
      }, 4500); // Extended to 4.5s to close after backend processing

      return () => {
        clearTimeout(backendProcessTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [isDepositSuccess]);

  // Handle approve
  const handleApprove = async () => {
    if (!selectedToken || !depositAmount) {
      setError("Lütfen token ve miktar seçin");
      return;
    }

    try {
      setError(null);
      const amountInWei = parseUnits(depositAmount, selectedToken.decimals);

      writeApprove({
        address: selectedToken.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [VOID_CONTRACT_ADDRESS, amountInWei],
        chainId: baseSepolia.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve başarısız");
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!selectedToken || !depositAmount) {
      setError("Lütfen token ve miktar seçin");
      return;
    }

    try {
      setError(null);
      const amountInWei = parseUnits(depositAmount, selectedToken.decimals);

      writeDeposit({
        address: VOID_CONTRACT_ADDRESS,
        abi: VOID_CONTRACT_ABI,
        functionName: "deposit",
        args: [amountInWei, selectedToken.address],
        chainId: baseSepolia.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit başarısız");
    }
  };

  const parsedAmount = useMemo(() => {
    const n = parseFloat(depositAmount);
    return Number.isFinite(n) ? n : 0;
  }, [depositAmount]);

  const parsedBalance = useMemo(() => {
    if (!selectedToken) return 0;
    return parseFloat(
      formatUnits(selectedToken.balance, selectedToken.decimals)
    );
  }, [selectedToken]);

  const isInsufficientBalance = parsedAmount > parsedBalance;

  // Check if user needs to approve more
  const needsApproval = useMemo(() => {
    if (!selectedToken || !depositAmount) return false;
    try {
      const amountInWei = parseUnits(depositAmount, selectedToken.decimals);
      return selectedToken.allowance < amountInWei;
    } catch {
      return false;
    }
  }, [selectedToken, depositAmount]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          // Reset transaction states when opening modal
          resetApprove();
          resetDeposit();
          hasCalledOnSuccessRef.current = false;
        } else {
          // Reset on close
          setTimeout(() => {
            setCurrentStep(1);
            setSelectedTokenAddress(undefined);
            setDepositAmount("");
            setError(null);
            hasCalledOnSuccessRef.current = false;
            resetApprove();
            resetDeposit();
          }, 200);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
        >
          <ArrowDownLeft className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
          Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#050505]/90 backdrop-blur-xl border border-white/10 text-white max-w-md p-0 gap-0 overflow-hidden shadow-2xl shadow-black/80">
        <DialogHeader className="p-8 pb-6 border-b border-white/5">
          <DialogTitle className="text-2xl font-light tracking-wide text-white">
            Deposit Funds
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-medium mt-2">
            Add assets to your Void Wallet
          </DialogDescription>
        </DialogHeader>

        {!address ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20 border border-white/5">
              <ArrowDownLeft className="w-8 h-8" />
            </div>
            <p className="text-white/60 text-sm font-light">
              Please connect your wallet to continue.
            </p>
          </div>
        ) : tokensError ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-400 border border-red-500/20">
              <ArrowDownLeft className="w-8 h-8" />
            </div>
            <p className="text-red-400 text-sm font-light">
              Failed to load tokens. Please try again.
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
                    width:
                      currentStep === 1
                        ? "0%"
                        : currentStep === 2
                          ? "50%"
                          : "100%",
                  }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                />

                {[1, 2, 3].map((step) => {
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
                        {step === 1
                          ? "Select"
                          : step === 2
                            ? "Approve"
                            : "Deposit"}
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
                        tokens={publicWalletTokens}
                        selectedTokenAddress={selectedTokenAddress}
                        onSelect={(addr) =>
                          setSelectedTokenAddress(addr as Address)
                        }
                        isLoading={isTokensLoading}
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
                              setDepositAmount(
                                formatUnits(
                                  selectedToken.balance,
                                  selectedToken.decimals
                                )
                              )
                            }
                            className="text-[10px] bg-white/10 hover:bg-white text-white hover:text-black px-3 py-1 rounded-full transition-all uppercase tracking-wider font-medium"
                          >
                            Max: {selectedToken.formattedBalance}
                          </button>
                        )}
                      </div>

                      <div className="relative group">
                        <Input
                          placeholder="0.00"
                          type="text"
                          value={depositAmount}
                          onChange={(e) => {
                            // Only allow numbers and decimals
                            if (/^\d*\.?\d*$/.test(e.target.value)) {
                              setDepositAmount(e.target.value);
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

                {/* Step 2: Approve */}
                {currentStep === 2 && (
                  <div className="flex flex-col h-full justify-start items-center text-center space-y-4">
                    {(() => {
                      const logoUrl = selectedToken
                        ? selectedToken.logo ||
                        getTokenLogoUrl(selectedToken.address)
                        : "";
                      return (
                        <div
                          className={`w-16 h-16 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-md overflow-hidden ${!logoUrl
                            ? "bg-gradient-to-br from-white/10 to-transparent"
                            : ""
                            }`}
                        >
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={selectedToken?.symbol}
                              className="w-full h-full object-contain bg-transparent p-2.5"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement!;
                                parent.className =
                                  "w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-md overflow-hidden";
                                const fallback = document.createElement("div");
                                fallback.className =
                                  "text-2xl font-bold text-white";
                                fallback.textContent =
                                  selectedToken?.symbol[0] || "?";
                                parent.appendChild(fallback);
                              }}
                            />
                          ) : (
                            <div className="text-2xl font-bold text-white">
                              {selectedToken?.symbol[0]}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <h3 className="text-xl font-light text-white tracking-wide">
                        Approve {selectedToken?.symbol}
                      </h3>
                      <p className="text-sm text-white/50 max-w-[280px] mx-auto leading-relaxed">
                        Allow the Void Wallet contract to spend your{" "}
                        <span className="text-white font-medium">
                          {depositAmount} {selectedToken?.symbol}
                        </span>
                        .
                      </p>
                    </div>

                    <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-white/40 uppercase tracking-wider text-xs">
                          Amount
                        </span>
                        <span className="font-mono text-white text-sm">
                          {depositAmount} {selectedToken?.symbol}
                        </span>
                      </div>
                      <div className="w-full h-[1px] bg-white/5 mb-2" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40 uppercase tracking-wider text-xs">
                          Contract
                        </span>
                        <span className="font-mono text-white/60 text-xs bg-white/5 px-2 py-1 rounded">
                          {VOID_CONTRACT_ADDRESS.slice(0, 6)}...
                          {VOID_CONTRACT_ADDRESS.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Deposit */}
                {currentStep === 3 && (
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
                      <ArrowDownLeft className="w-8 h-8" />
                    </motion.div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-light text-white tracking-wide">
                        Confirm Deposit
                      </h3>
                      <p className="text-sm text-white/50 max-w-[280px] mx-auto leading-relaxed">
                        You are about to deposit{" "}
                        <span className="text-white font-medium">
                          {depositAmount} {selectedToken?.symbol}
                        </span>{" "}
                        into your Void Wallet.
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
                              getTokenLogoUrl(selectedToken.address)
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
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40 uppercase tracking-wider text-xs">
                          Total Amount
                        </span>
                        <span className="font-mono text-lg text-white">
                          {depositAmount}
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
                {(approveError || depositError || error) &&
                  !isApproveSuccess &&
                  !isDepositSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-lg shadow-red-900/20"
                    >
                      {approveError?.message || depositError?.message || error}
                    </motion.div>
                  )}
                {isDepositSuccess && currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <Check className="w-3 h-3" />
                    Deposited successfully! Closing...
                  </motion.div>
                )}
                {isApproveSuccess && currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <Check className="w-3 h-3" />
                    Approved successfully
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Reset transaction states when going back
                      resetApprove();
                      resetDeposit();
                      setError(null);

                      if (currentStep === 2) setCurrentStep(1);
                      else if (currentStep === 3)
                        needsApproval ? setCurrentStep(2) : setCurrentStep(1);
                    }}
                    disabled={
                      isApprovePending ||
                      isApproveConfirming ||
                      isDepositPending ||
                      isDepositConfirming
                    }
                    className="h-12 px-6 text-white/40 hover:text-white hover:bg-white/5 uppercase tracking-widest text-xs font-medium rounded-none"
                  >
                    Back
                  </Button>
                )}

                <Button
                  className="flex-1 h-12 bg-white text-black hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-xs font-bold disabled:opacity-50 disabled:hover:scale-100 rounded-none shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:bg-white/10 disabled:text-white/20 disabled:shadow-none"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (needsApproval) setCurrentStep(2);
                      else setCurrentStep(3);
                    } else if (currentStep === 2) {
                      handleApprove();
                    } else if (currentStep === 3) {
                      handleDeposit();
                    }
                  }}
                  disabled={
                    (currentStep === 1 &&
                      (!selectedToken ||
                        !depositAmount ||
                        isInsufficientBalance ||
                        parsedAmount <= 0)) ||
                    isApprovePending ||
                    isApproveConfirming ||
                    isDepositPending ||
                    isDepositConfirming ||
                    isDepositSuccess
                  }
                >
                  {currentStep === 1
                    ? "Continue"
                    : currentStep === 2
                      ? isApprovePending || isApproveConfirming
                        ? "Approving..."
                        : "Approve Token"
                      : isDepositPending || isDepositConfirming
                        ? "Depositing..."
                        : "Confirm Deposit"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
