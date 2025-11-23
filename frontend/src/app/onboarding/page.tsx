"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { DecryptedText } from "@/components/DecryptedText";
import { useSignMessage } from "wagmi";
import { readPersistedAuthToken } from "@/lib/sign/auth";
import {
  Shield,
  Lock,
  ArrowRight,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

// Mock Data
const TOKENS = [
  {
    id: "usdc",
    symbol: "USDC",
    name: "USD Coin",
    balance: "23.242",
    value: "23.24",
    icon: "/USDC.png",
  },
  {
    id: "rose",
    symbol: "ROSE",
    name: "Oasis",
    balance: "15236.31",
    value: "240.58",
    icon: "/ROSE.png",
  },
  {
    id: "weth",
    symbol: "WETH",
    name: "Wrapped Ether",
    balance: "1.504",
    value: "2,707.34",
    icon: "/WETH.png",
  },
];

const TRANSACTIONS = [
  {
    id: "tx1",
    type: "Sent",
    amount: "100.00",
    asset: "USDC",
    date: "2 mins ago",
    icon: ArrowUpRight,
    color: "text-red-400",
  },
  {
    id: "tx2",
    type: "Received",
    amount: "0.5",
    asset: "WETH",
    date: "1 hour ago",
    icon: ArrowDownLeft,
    color: "text-green-400",
  },
  {
    id: "tx3",
    type: "Swap",
    amount: "50 ROSE → USDC",
    asset: "ROSE",
    date: "3 hours ago",
    icon: Repeat,
    color: "text-blue-400",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [activePart, setActivePart] = useState<1 | 2>(1);
  // Removed selectedTokens state since we select all by default
  const [isShielding, setIsShielding] = useState(false);
  const [shielded, setShielded] = useState(false);

  // Part 2 States (Transactions)
  const [isShieldingTx, setIsShieldingTx] = useState(false);
  const [shieldedTx, setShieldedTx] = useState(false);

  const { signMessageAsync } = useSignMessage();

  const submitSecret = async (
    signature: string,
    message: string,
    type: "balance" | "transaction"
  ) => {
    try {
      const token = readPersistedAuthToken();
      const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;

      if (!token || !baseUrl) {
        throw new Error("Authentication or API URL missing");
      }

      const endpoint =
        type === "balance"
          ? "/api/wallet/set-balance-secret"
          : "/api/wallet/set-tx-secret";

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit ${type} secret`);
      }

      return await response.json();
    } catch (error) {
      console.error("Secret submission failed:", error);
      throw error;
    }
  };

  const handlePart1Next = async () => {
    setIsShielding(true);
    const message = "Void Wallet Balances Secret";

    try {
      const signature = await signMessageAsync({ message });

      // Submit signature to backend
      await submitSecret(signature, message, "balance");

      setShielded(true);
      setTimeout(() => {
        setActivePart(2);
      }, 750);
    } catch (error) {
      console.error("Failed to process step 1:", error);
      setIsShielding(false);
    }
  };

  const handlePart2Next = async () => {
    setIsShieldingTx(true);
    const message = "Void Wallet Transactions Secret";

    try {
      const signature = await signMessageAsync({ message });

      // Submit signature to backend
      await submitSecret(signature, message, "transaction");

      setShieldedTx(true);
      setTimeout(() => {
        router.push("/");
      }, 750);
    } catch (error) {
      console.error("Failed to process step 2:", error);
      setIsShieldingTx(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 relative z-10">
        {/* PART 1: Shield Assets */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{
            opacity: activePart === 1 ? 1 : 0.4,
            x: 0,
            scale: activePart === 1 ? 1 : 0.95,
            filter: activePart === 1 ? "blur(0px)" : "blur(2px)",
          }}
          transition={{ duration: 0.5 }}
          className={`relative border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl overflow-hidden ${
            activePart !== 1 ? "pointer-events-none" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />

          <div className="relative z-10 h-full flex flex-col">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-4">
                <Shield className="w-3 h-3" />
                Step 1 of 2
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
                Hide Your Balances
              </h2>
              <p className="text-white/50 text-sm sm:text-base max-w-md">
                We use Trusted Execution Environments (TEE) and Sparse Merkle
                Trees to secure your privacy. Sign the message to initialize
                your private wallet.
              </p>
            </div>

            {/* Token List */}
            <div className="space-y-3 flex-1 min-h-[300px]">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/30 px-4">
                <span>Asset</span>
                <span>Balance</span>
              </div>

              <div className="space-y-3">
                {TOKENS.map((token, index) => {
                  const isEncrypted = shielded;

                  return (
                    <motion.div
                      key={token.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300
                        bg-white/5 border-white/20 shadow-[0_0_20px_-5px_rgba(255,255,255,0.05)]
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 p-2 flex items-center justify-center">
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div>
                          <div className="font-bold text-sm">
                            {isEncrypted ? (
                              <DecryptedText
                                text={token.symbol}
                                speed={30}
                                className="text-white/80"
                              />
                            ) : (
                              token.symbol
                            )}
                          </div>
                          <div className="text-xs text-white/40">
                            {isEncrypted ? (
                              <DecryptedText text={token.name} speed={50} />
                            ) : (
                              token.name
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-medium text-sm">
                          {isEncrypted ? (
                            <DecryptedText
                              text={`${token.balance} ${token.symbol}`}
                              speed={20}
                            />
                          ) : (
                            `${token.balance} ${token.symbol}`
                          )}
                        </div>
                        <div className="text-xs text-white/40">
                          {isEncrypted ? (
                            <DecryptedText text={`$${token.value}`} />
                          ) : (
                            `$${token.value}`
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handlePart1Next}
                disabled={isShielding || shielded}
                className={`h-12 px-8 font-semibold text-sm rounded-full flex items-center gap-2 transition-all duration-300
                  ${
                    shielded
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-white text-black hover:bg-zinc-200 hover:scale-105"
                  }`}
              >
                {shielded ? (
                  <>
                    Confirmed
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : isShielding ? (
                  <>
                    <Lock className="w-4 h-4 animate-pulse" />
                    Securing...
                  </>
                ) : (
                  <>
                    Sign & Hide
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* PART 2: Hide Transactions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: activePart === 2 ? 1 : 0.4,
            x: 0,
            scale: activePart === 2 ? 1 : 0.95,
            filter: activePart === 2 ? "blur(0px)" : "blur(2px)",
          }}
          transition={{ duration: 0.5 }}
          className={`relative border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl overflow-hidden col-start-1 lg:col-start-2 row-start-1 ${
            activePart !== 2 ? "pointer-events-none" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />

          <div className="relative z-10 h-full flex flex-col">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mb-4">
                <Activity className="w-3 h-3" />
                Step 2 of 2
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
                Hide Your Transactions
              </h2>
              <p className="text-white/50 text-sm sm:text-base max-w-md">
                Encrypting your transaction history. Your past activity will be
                hidden from public view but verifiable within the TEE.
              </p>
            </div>

            {/* Transaction List */}
            <div className="space-y-3 flex-1 min-h-[300px]">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/30 px-4">
                <span>Activity</span>
                <span>Time</span>
              </div>

              <div className="space-y-3">
                {TRANSACTIONS.map((tx, index) => {
                  const isEncrypted = shieldedTx;

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300
                        bg-white/5 border-white/20 shadow-[0_0_20px_-5px_rgba(255,255,255,0.05)]
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 p-2 flex items-center justify-center">
                          <tx.icon className={`w-5 h-5 ${tx.color}`} />
                        </div>

                        <div>
                          <div className="font-bold text-sm">
                            {isEncrypted ? (
                              <DecryptedText
                                text={tx.type}
                                speed={30}
                                className="text-white/80"
                              />
                            ) : (
                              tx.type
                            )}
                          </div>
                          <div className="text-xs text-white/40">
                            {isEncrypted ? (
                              <DecryptedText
                                text={`${tx.amount} ${tx.asset}`}
                                speed={50}
                              />
                            ) : (
                              `${tx.amount} ${tx.asset}`
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-white/40">
                          {isEncrypted ? (
                            <DecryptedText text={tx.date} speed={20} />
                          ) : (
                            tx.date
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handlePart2Next}
                disabled={isShieldingTx || shieldedTx}
                className={`h-12 px-8 font-semibold text-sm rounded-full flex items-center gap-2 transition-all duration-300
                  ${
                    shieldedTx
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-white text-black hover:bg-zinc-200 hover:scale-105"
                  }`}
              >
                {shieldedTx ? (
                  <>
                    Confirmed
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : isShieldingTx ? (
                  <>
                    <Lock className="w-4 h-4 animate-pulse" />
                    Securing...
                  </>
                ) : (
                  <>
                    Enter Void
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
