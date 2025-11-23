import {
  SignatureSubmissionResult,
  shouldBypassSignatureSubmission,
} from "./utils";

const AUTH_TOKEN_STORAGE_KEY = "VOID_AUTH_TOKEN";

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to read auth token:", error);
    return null;
  }
};

export type SendTransaction = {
  from: string;
  to: string;
  token: string;
  amount: string;
};

export type TransferPayload = {
  sendTransaction: SendTransaction;
  signature: string;
};

/**
 * Builds the payload and submits it to the backend for wallet transfer.
 */
export async function submitTransferSignature(
  sendTransaction: SendTransaction,
  signature: string
): Promise<SignatureSubmissionResult> {
  const payload: TransferPayload = {
    sendTransaction,
    signature,
  };

  if (shouldBypassSignatureSubmission) {
    return {
      success: true,
      message: "Transfer submission bypassed",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/wallet/transfer`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "Transfer submission failed";
    try {
      const text = await response.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json?.error || json?.message || text;
        } catch {
          errorMessage = text;
        }
      }
    } catch {}
    console.error("Backend error response:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();


  return {
    success: true,
    ...data,
  };
}
