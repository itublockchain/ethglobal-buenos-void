"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { DecryptedText } from "@/components/DecryptedText";
import {
  Shield,
  Lock,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Activity,
  Wallet,
  Loader2,
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
    id: "dai",
    symbol: "DAI",
    name: "Dai Stablecoin",
    balance: "150.50",
    value: "150.50",
    icon: "/DAI.png",
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

export default function OnboardingPage() {
  const router = useRouter();
  const [activePart, setActivePart] = useState<1 | 2>(1);
  // Removed selectedTokens state since we select all by default
  const [isShielding, setIsShielding] = useState(false);
  const [shielded, setShielded] = useState(false);

  // Part 2 States
  const [verificationSteps, setVerificationSteps] = useState({
    hashing: false,
    proof: false,
    relayer: false,
  });

  const handlePart1Next = () => {
    setIsShielding(true);

    // Simulate shielding process
    setTimeout(() => {
      setShielded(true);
      setTimeout(() => {
        setActivePart(2);
        startVerification();
      }, 1500);
    }, 1000);
  };

  const startVerification = () => {
    // Simulate sequential verification steps
    setTimeout(
      () => setVerificationSteps((p) => ({ ...p, hashing: true })),
      500
    );
    setTimeout(
      () => setVerificationSteps((p) => ({ ...p, proof: true })),
      2000
    );
    setTimeout(
      () => setVerificationSteps((p) => ({ ...p, relayer: true })),
      3500
    );
  };

  const handlePart2Next = async () => {
    router.push("/");
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
                disabled={isShielding}
                className="h-12 px-8 bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all duration-300 font-semibold text-sm rounded-full flex items-center gap-2"
              >
                {isShielding ? (
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

        {/* PART 2: Proof Generation */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: activePart === 2 ? 1 : 0.4,
            x: 0,
            scale: activePart === 2 ? 1 : 0.95,
            filter: activePart === 2 ? "blur(0px)" : "blur(2px)",
          }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`relative border border-white/10 bg-black/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl overflow-hidden ${
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
                Secure Initialization
              </h2>
              <p className="text-white/50 text-sm sm:text-base max-w-md">
                Initializing your private state within the TEE using Sparse
                Merkle Trees for complete privacy.
              </p>
            </div>

            {/* Terminal / Steps */}
            <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-6 font-mono text-sm relative overflow-hidden">
              {/* Grid background for terminal */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="space-y-6 relative z-10">
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full ${
                      verificationSteps.hashing
                        ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        : "bg-white/20"
                    }`}
                  />
                  <div>
                    <div
                      className={`font-bold ${
                        verificationSteps.hashing
                          ? "text-white"
                          : "text-white/40"
                      }`}
                    >
                      Verifying Signature
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {verificationSteps.hashing ? "Verified" : "Waiting..."}
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full ${
                      verificationSteps.proof
                        ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        : "bg-white/20"
                    }`}
                  />
                  <div>
                    <div
                      className={`font-bold ${
                        verificationSteps.proof ? "text-white" : "text-white/40"
                      }`}
                    >
                      Updating Sparse Merkle Tree
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {verificationSteps.proof
                        ? "Root updated"
                        : "Calculating leaves..."}
                    </div>
                    {verificationSteps.hashing && !verificationSteps.proof && (
                      <div className="mt-2 text-xs text-green-500/80 font-mono">
                        {`> updating_leaves...`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full ${
                      verificationSteps.relayer
                        ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        : "bg-white/20"
                    }`}
                  />
                  <div>
                    <div
                      className={`font-bold ${
                        verificationSteps.relayer
                          ? "text-white"
                          : "text-white/40"
                      }`}
                    >
                      TEE Attestation
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {verificationSteps.relayer
                        ? "Secure Enclave Synced"
                        : "Pending confirmation..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handlePart2Next}
                disabled={!verificationSteps.relayer}
                className="h-12 px-8 bg-white text-black hover:bg-zinc-200 hover:scale-105 transition-all duration-300 font-semibold text-sm rounded-full flex items-center gap-2"
              >
                {verificationSteps.relayer ? (
                  <>
                    Enter Void
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
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
