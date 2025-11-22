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
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/40 px-4 pb-2 border-b border-white/10">
        <span>Sign Message</span>
        <span className="text-[10px] text-white/60">WalletConnect</span>
      </div>
      <div className="p-4 border border-white/10 bg-white/5 space-y-3">
        <Button
          variant="outline"
          className="w-full h-12 uppercase tracking-[0.3em] text-xs transition-all hover:cursor-pointer hover:text-black hover:bg-white hover:border-white shadow-sm hover:shadow-[0_0_25px_rgba(255,255,255,0.35)]"
          onClick={handleSignAndSubmit}
          disabled={isSigningMessage}
        >
          {buttonLabel}
        </Button>
        {signatureState ? (
          <div className="text-[11px] font-mono text-white/70 space-y-2">
            <p className="text-white/60">
              Signed message:
              <span className="ml-1 text-white break-words">
                {signatureState.message}
              </span>
            </p>
            <p className="text-white/60">
              Signature:
              <span className="ml-1 text-white break-words">
                {signatureState.signature}
              </span>
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-white/50">
            No previous signature recorded.
          </p>
        )}
        {signError && (
          <p className="text-[11px] text-red-400">Error: {signError}</p>
        )}
        {statusMessage && (
          <p
            className={`text-[11px] ${
              submissionStatus === "error"
                ? "text-red-400"
                : submissionStatus === "success"
                ? "text-emerald-400"
                : "text-white/60"
            }`}
          >
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
