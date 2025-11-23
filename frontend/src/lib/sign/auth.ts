import {
  SignatureSubmissionResult,
  shouldBypassSignatureSubmission,
} from "./utils";

export type LoginPayload = {
  address: string;
  message: string;
  signature: string;
};

export const AUTH_TOKEN_STORAGE_KEY = "VOID_AUTH_TOKEN";
const shouldSkipSignatureWithToken =
  process.env.NEXT_PUBLIC_VOID_SKIP_SIGNATURE_WITH_TOKEN === "true";

export const persistAuthToken = (token?: string) => {
  if (!token || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error("Failed to persist auth token:", error);
  }
};

export const readPersistedAuthToken = () => {
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

export const clearAuthToken = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    // Also clear balance cache on logout
    window.localStorage.removeItem("VOID_WALLET_BALANCES");
  } catch (error) {
    console.error("Failed to clear auth token:", error);
  }
};

/**
 * Decodes a JWT token without verification (client-side only).
 * Returns the payload if successful, null otherwise.
 */
export const decodeJWT = (
  token: string
): { wallet?: string; iat?: number; exp?: number } | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

/**
 * Validates if the token's wallet address matches the connected wallet.
 * Returns true if valid, false otherwise.
 */
export const validateTokenWallet = (
  token: string,
  connectedAddress: string
): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.wallet) {
    return false;
  }

  // Compare addresses (case-insensitive)
  return payload.wallet.toLowerCase() === connectedAddress.toLowerCase();
};

/**
 * Determines whether we can skip the signature flow using an existing bearer token.
 * Currently operates in bypass mode so that backend integration can be added later.
 */
export async function canSkipSignatureWithStoredToken(): Promise<boolean> {
  if (!shouldSkipSignatureWithToken) {
    return false;
  }

  const token = readPersistedAuthToken();
  if (!token) {
    return false;
  }

  // Backend validation will be added by the backend teammate.
  // For now, the presence of a stored token is enough when the feature flag is enabled.
  return true;
}

/**
 * Builds the payload and submits it to the backend for login/auth.
 */
export async function submitLoginSignature(
  address: string,
  message: string,
  signature: string
): Promise<SignatureSubmissionResult> {
  const payload: LoginPayload = {
    address,
    message,
    signature,
  };

  if (shouldBypassSignatureSubmission) {
    return {
      success: true,
      message: "Signature submission bypassed",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMessage =
      (await response.text()) || "Signature submission failed";
    console.error("Backend error response:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const token = data?.token ?? data?.data?.token;
  const wallet = data?.wallet ?? data?.data?.wallet ?? address;
  const messageFromApi = data?.message ?? data?.data?.message;

  persistAuthToken(token);

  return {
    success: data?.success ?? true,
    token,
    wallet,
    message: messageFromApi,
    error: data?.error,
  };
}
