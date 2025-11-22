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

export type TokenBalance = {
  token: string;
  balance: string;
  decimals: number;
  symbol: string;
};

export type BalanceResponse = {
  address: string;
  balances: TokenBalance[];
};

/**
 * Fetches wallet balances from the backend
 */
export async function fetchWalletBalances(): Promise<BalanceResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("No authentication token found. Please sign in first.");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${baseUrl}/api/balance`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorMessage =
      (await response.text()) || "Failed to fetch balances";
    console.error("Backend error response:", errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();

  console.log("fetchWalletBalances data:", data);

  return data;
}

