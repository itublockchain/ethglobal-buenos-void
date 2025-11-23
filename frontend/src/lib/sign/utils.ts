export type SignatureSubmissionResult = {
  success: boolean;
  message?: string;
  token?: string;
  wallet?: string;
  error?: string;
};

export const shouldBypassSignatureSubmission =
  process.env.NEXT_PUBLIC_BYPASS_SIGNATURE_SUBMISSION === "true";

export const buildLoginMessage = (timestamp: number) =>
  `Login Void Wallet Timestamp:${timestamp}`;
