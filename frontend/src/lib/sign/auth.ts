import {
  SignatureSubmissionResult,
  shouldBypassSignatureSubmission,
} from "./utils";

export type LoginPayload = {
  address: string;
  message: string;
  signature: string;
};

const AUTH_TOKEN_STORAGE_KEY = "VOID_AUTH_TOKEN";
const shouldSkipSignatureWithToken =
  process.env.NEXT_PUBLIC_VOID_SKIP_SIGNATURE_WITH_TOKEN === "true";

const persistAuthToken = (token?: string) => {
  if (!token || typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error("Failed to persist auth token:", error);
  }
};

const readPersistedAuthToken = () => {
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
