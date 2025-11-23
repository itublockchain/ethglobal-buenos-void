import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Search } from "lucide-react";
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
import { useAccount, useSignMessage } from "wagmi";
import { getTokenLogoUrl } from "@/lib/utils";
import {
    submitTransferSignature,
    type SendTransaction,
} from "@/lib/sign/transfer";
import { Asset } from "./types";

export function SendTokenDialog({
    tokens,
    onSuccess,
}: {
    tokens: Asset[];
    onSuccess?: () => Promise<void> | void;
}) {
    const { address } = useAccount();
    const tokensWithId = useMemo(
        () => tokens.map((t) => ({ ...t, id: t.address ?? t.symbol })),
        [tokens]
    );

    const [open, setOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState("");
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sendSuccess, setSendSuccess] = useState(false);

    const { signMessageAsync } = useSignMessage();

    // Filter tokens based on search query
    const filteredTokens = useMemo(() => {
        if (!searchQuery) return tokensWithId;
        const lowerQuery = searchQuery.toLowerCase();
        return tokensWithId.filter(
            (t) =>
                t.symbol.toLowerCase().includes(lowerQuery) ||
                t.name.toLowerCase().includes(lowerQuery)
        );
    }, [tokensWithId, searchQuery]);

    const selectedToken = tokensWithId.find(
        (token) => token.id === selectedTokenId
    );

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            const timer = setTimeout(() => {
                setCurrentStep(1);
                setSearchQuery("");
                setRecipientAddress("");
                setAmount("");
                setSendError(null);
                setSendSuccess(false);
                setSelectedTokenId(undefined);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [open]);

    const handleSendTransaction = async () => {
        if (!address || !signMessageAsync) {
            setSendError("Wallet not connected");
            return;
        }

        setIsSending(true);
        setSendError(null);
        setSendSuccess(false);

        try {
            const sendTransaction: SendTransaction = {
                from: address,
                to: recipientAddress,
                token:
                    selectedToken?.address ||
                    "0x0000000000000000000000000000000000000000",
                amount: amount,
            };

            const message = JSON.stringify(sendTransaction);
            const signature = await signMessageAsync({ message });
            const result = await submitTransferSignature(sendTransaction, signature);

            if (result.success) {
                setSendSuccess(true);
                try {
                    await onSuccess?.();
                } catch (e) {
                    console.error("Post-transfer refresh failed:", e);
                }
                setTimeout(() => {
                    setOpen(false);
                }, 1500);
            } else {
                setSendError(result.message || "Transfer failed");
            }
        } catch (error) {
            setSendError(error instanceof Error ? error.message : "Transfer failed");
        } finally {
            setIsSending(false);
        }
    };

    const parsedAmount = parseFloat(amount) || 0;
    const insufficient = (selectedToken?.amount ?? 0) < parsedAmount;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="h-14 border-white/10 bg-white/5 hover:bg-white hover:text-black hover:border-white transition-all text-base uppercase tracking-wider font-medium group cursor-pointer"
                >
                    <ArrowRight className="mr-2 w-4 h-4 group-hover:scale-110 transition-transform" />
                    Send
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#050505]/90 backdrop-blur-xl border border-white/10 text-white max-w-md p-0 gap-0 overflow-hidden shadow-2xl shadow-black/80">
                <DialogHeader className="p-8 pb-6 border-b border-white/5">
                    <DialogTitle className="text-2xl font-light tracking-wide text-white">
                        Send Assets
                    </DialogTitle>
                    <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-medium mt-2">
                        Transfer funds to another wallet
                    </DialogDescription>
                </DialogHeader>

                {!address ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 text-white/20 border border-white/5">
                            <ArrowRight className="w-8 h-8" />
                        </div>
                        <p className="text-white/60 text-sm font-light">
                            Please connect your wallet to continue.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col max-h-[600px]">
                        {/* Progress Steps */}
                        <div className="px-10 py-4 border-b border-white/5 bg-white/[0.01]">
                            <div className="relative flex items-center justify-between">
                                <div className="absolute left-0 top-[15px] w-full h-[2px] bg-white/5 z-0 rounded-full" />
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
                                                        ? "Details"
                                                        : "Confirm"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-left relative min-h-[400px]">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="h-full flex flex-col"
                            >
                                {/* Step 1: Select Asset */}
                                {currentStep === 1 && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                            <Input
                                                placeholder="Search assets..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="h-12 bg-white/5 border-white/10 pl-10 text-sm text-white placeholder:text-white/20 focus:bg-white/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold ml-1">
                                                Available Assets
                                            </label>
                                            <div className="grid gap-3">
                                                {filteredTokens.length === 0 ? (
                                                    <div className="text-center py-10 border border-dashed border-white/10 bg-white/[0.02]">
                                                        <span className="text-sm text-white/40 font-light">
                                                            No assets found
                                                        </span>
                                                    </div>
                                                ) : (
                                                    filteredTokens.map((token) => {
                                                        const logoUrl = token.address
                                                            ? getTokenLogoUrl(token.address)
                                                            : "";
                                                        return (
                                                            <motion.button
                                                                key={token.id}
                                                                onClick={() => {
                                                                    setSelectedTokenId(token.id);
                                                                    setCurrentStep(2);
                                                                }}
                                                                whileHover={{
                                                                    scale: 1.01,
                                                                    backgroundColor: "rgba(255,255,255,0.08)",
                                                                }}
                                                                whileTap={{ scale: 0.99 }}
                                                                className="flex items-center justify-between p-4 rounded-none border border-white/5 bg-white/5 text-white hover:border-white/20 transition-all duration-300 group w-full"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                                                        {logoUrl ? (
                                                                            <img
                                                                                src={logoUrl}
                                                                                alt={token.symbol}
                                                                                className="w-full h-full object-contain"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display =
                                                                                        "none";
                                                                                    e.currentTarget.parentElement!.innerText =
                                                                                        token.symbol[0];
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            token.symbol[0]
                                                                        )}
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="font-bold text-sm tracking-wide">
                                                                            {token.symbol}
                                                                        </div>
                                                                        <div className="text-xs text-white/40">
                                                                            Balance: {token.amount.toFixed(6)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                                                            </motion.button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Details */}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-none border border-white/5">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                                {selectedToken?.address &&
                                                    getTokenLogoUrl(selectedToken.address) ? (
                                                    <img
                                                        src={getTokenLogoUrl(selectedToken.address)}
                                                        alt={selectedToken.symbol}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    selectedToken?.symbol[0]
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">
                                                    {selectedToken?.symbol}
                                                </div>
                                                <div className="text-xs text-white/40">
                                                    Balance: {selectedToken?.amount.toFixed(6)}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCurrentStep(1)}
                                                className="ml-auto text-xs text-white/40 hover:text-white rounded-none"
                                            >
                                                Change
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold ml-1">
                                                    Recipient Address
                                                </label>
                                                <Input
                                                    placeholder="0x..."
                                                    value={recipientAddress}
                                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                                    className="h-14 bg-black/40 border border-white/10 focus:border-white/50 text-sm font-light px-4 rounded-none text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between px-1">
                                                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">
                                                        Amount
                                                    </label>
                                                    <button
                                                        onClick={() =>
                                                            setAmount(selectedToken?.amount.toString() || "")
                                                        }
                                                        className="text-[10px] bg-white/10 hover:bg-white text-white hover:text-black px-3 py-1 rounded-none transition-all uppercase tracking-wider font-medium"
                                                    >
                                                        Max: {selectedToken?.amount.toFixed(6)}
                                                    </button>
                                                </div>
                                                <Input
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) =>
                                                        /^\d*\.?\d*$/.test(e.target.value) &&
                                                        setAmount(e.target.value)
                                                    }
                                                    className="h-20 bg-black/40 border border-white/10 focus:border-white/50 text-4xl font-light pl-6 rounded-none text-white"
                                                />
                                                {insufficient && (
                                                    <div className="text-xs text-red-400 px-2">
                                                        Insufficient balance
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Confirm */}
                                {currentStep === 3 && (
                                    <div className="flex flex-col h-full items-center text-center space-y-6 pt-4">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-light text-white tracking-wide">
                                                Confirm Transfer
                                            </h3>
                                            <p className="text-sm text-white/50">
                                                Review your transaction details
                                            </p>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-none p-6 border border-white/5 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/40 text-xs uppercase tracking-wider">
                                                    Asset
                                                </span>
                                                <span className="text-white font-bold">
                                                    {selectedToken?.symbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/40 text-xs uppercase tracking-wider">
                                                    Amount
                                                </span>
                                                <span className="text-white font-mono text-lg">
                                                    {amount}
                                                </span>
                                            </div>
                                            <div className="w-full h-[1px] bg-white/5" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-white/40 text-xs uppercase tracking-wider">
                                                    To
                                                </span>
                                                <span className="text-white/60 font-mono text-xs">
                                                    {recipientAddress.slice(0, 6)}...
                                                    {recipientAddress.slice(-4)}
                                                </span>
                                            </div>
                                        </div>
                                        {sendError && (
                                            <div className="text-red-400 text-xs bg-red-500/10 px-4 py-2 rounded-lg">
                                                {sendError}
                                            </div>
                                        )}
                                        {sendSuccess && (
                                            <div className="text-emerald-400 text-xs bg-emerald-500/10 px-4 py-2 rounded-lg">
                                                Transfer Successful!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 pt-4 border-t border-white/5 bg-[#050505]/50 backdrop-blur-md">
                            <div className="flex gap-3">
                                {currentStep > 1 && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentStep((c) => c - 1)}
                                        disabled={isSending || sendSuccess}
                                        className="h-12 px-6 text-white/40 hover:text-white uppercase tracking-widest text-xs font-medium rounded-none"
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button
                                    className="flex-1 h-12 bg-white text-black hover:bg-white/90 uppercase tracking-[0.2em] text-xs font-bold"
                                    onClick={() => {
                                        if (currentStep === 1) return;
                                        if (currentStep === 2) setCurrentStep(3);
                                        if (currentStep === 3) handleSendTransaction();
                                    }}
                                    disabled={
                                        (currentStep === 2 &&
                                            (!recipientAddress || !amount || insufficient)) ||
                                        isSending ||
                                        sendSuccess
                                    }
                                >
                                    {currentStep === 2
                                        ? "Review"
                                        : isSending
                                            ? "Sending..."
                                            : "Send "}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
