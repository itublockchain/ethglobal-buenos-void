"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildLoginMessage,
  submitSignatureToBackend,
  shouldBypassSignatureSubmission,
  type SignatureSubmissionResult,
} from "@/lib/sign";
import { useSignMessage } from "wagmi";

interface SignMessageSectionProps {
  address?: string;
  onSuccess: () => void;
}

type SignedMessage = {
  message: string;
  signature: string;
  timestamp: number;
};

export function SignMessageSection({
  address,
  onSuccess,
}: SignMessageSectionProps) {
  const [signatureState, setSignatureState] = useState<SignedMessage | null>(
    null
  );
  const [signError, setSignError] = useState<string | null>(null);
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [serverAck, setServerAck] = useState<SignatureSubmissionResult | null>(
    null
  );

  const { signMessageAsync } = useSignMessage();
  const buttonLabel = isSigningMessage ? "Signing..." : "Sign Message";
  const isAddressMissing = !address;

  const resetFeedback = useCallback(() => {
    setSubmissionError(null);
    setServerAck(null);
  }, []);

  const handleSubmissionError = useCallback(
    (errorMessage: string) => {
      if (shouldBypassSignatureSubmission) {
        setServerAck({
          success: true,
          message: `Bypass: ${errorMessage}`,
        });
        setSubmissionStatus("success");
        setSubmissionError(null);
        onSuccess();
        return;
      }
      setSubmissionStatus("error");
      setSubmissionError(errorMessage);
      setSignatureState(null);
      setServerAck(null);
    },
    [onSuccess]
  );

  const handleSignAndSubmit = useCallback(async () => {
    if (!signMessageAsync) {
      setSignError("Wallet connector is not ready.");
      return;
    }

    if (isAddressMissing) {
      setSignError("Wallet address is missing.");
      return;
    }

    setSignError(null);
    setIsSigningMessage(true);
    resetFeedback();

    const timestamp = Date.now();
    const message = buildLoginMessage(timestamp);

    try {
      const signature = await signMessageAsync({ message });
      setSignatureState({ message, signature, timestamp });
      setSubmissionStatus("pending");

      try {
        const ack = await submitSignatureToBackend(
          address!,
          message,
          signature
        );
        setServerAck(ack);
        setSubmissionStatus("success");
        onSuccess();
      } catch (submitError) {
        const errorMessage =
          submitError instanceof Error
            ? submitError.message
            : String(submitError);
        handleSubmissionError(errorMessage);
      }
    } catch (signError) {
      setSignatureState(null);
      setSignError(
        signError instanceof Error ? signError.message : String(signError)
      );
    } finally {
      setIsSigningMessage(false);
    }
  }, [
    address,
    handleSubmissionError,
    isAddressMissing,
    onSuccess,
    resetFeedback,
    signMessageAsync,
  ]);

  const statusMessage = useMemo(() => {
    if (submissionStatus === "pending") {
      return "Sending to backend…";
    }
    if (submissionStatus === "success" && serverAck) {
      return serverAck.message ?? "Signature recorded";
    }
    if (submissionStatus === "error" && submissionError) {
      return `Error: ${submissionError}`;
    }
    return null;
  }, [serverAck, submissionError, submissionStatus]);

  return (
    <div className="space-y-3 mb-10">
      {/* Header - Privacy Focused */}
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40 px-4 pb-2 border-b border-white/10">
        <span>Access Control</span>
        <span className="text-[10px] text-white/60">WalletConnect</span>
      </div>

      {/* Main Locked State */}
      <div className="relative border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-md overflow-hidden">
        {/* Cyber grid background effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} />

        {/* Glowing top edge */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative p-8 space-y-6">
          {/* Lock Icon with Animation */}
          <div className="flex justify-center">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full scale-150 group-hover:bg-white/20 transition-all duration-500" />

              {/* Lock icon */}
              <svg
                className="w-12 h-12 text-white/90 group-hover:scale-110 transition-transform duration-300 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-light tracking-[0.3em] text-white uppercase">
              Wallet Locked
            </h3>
            <p className="text-xs text-white/40 tracking-wider uppercase">
              Authentication Required
            </p>
          </div>

          {/* Unlock Button */}
          <div className="pt-2">
            <Button
              onClick={handleSignAndSubmit}
              disabled={isSigningMessage}
              className="w-full h-14 bg-white/5 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white uppercase tracking-[0.3em] text-xs font-bold transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              {/* Animated background on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

              {/* Button content */}
              <span className="relative flex items-center justify-center gap-3">
                {isSigningMessage ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Authenticating
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    To Unlock
                  </>
                )}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Add keyframe animation for scanning effect */}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(-100%); }
        }
      `}</style>
    </div>
  );
}
