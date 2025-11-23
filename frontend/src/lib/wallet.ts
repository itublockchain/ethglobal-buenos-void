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

export type WithdrawResponse = {
  success: boolean;
  message?: string;
  error?: string;
  txHash?: string;
};

/**
 * Submits a withdraw request to the backend.
 */
export async function withdrawFromWallet(
  amount: string,
  tokenAddress: string
): Promise<WithdrawResponse> {
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

  const response = await fetch(`${baseUrl}/api/wallet/withdraw?amount=${amount}&token=${tokenAddress}`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    let errorMessage = "Withdraw request failed";
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
    } catch { }
    console.error("Backend error response:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    success: true,
    ...data,
  };
}

