import { readPersistedAuthToken } from "@/lib/sign/auth";

export type WalletTransaction = {
  sender: string;
  receiver: string;
  token: string;
  amount: string;
  timestamp: number | string;
  type: string;
};

type TransactionsApiResponse = {
  success?: boolean;
  data?: {
    transactions?: WalletTransaction[];
  };
  transactions?: WalletTransaction[];
};

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  const token = readPersistedAuthToken();

  if (!token) {
    throw new Error("No authentication token found. Please sign in first.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`${baseUrl}/api/transactions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage =
        (await response.text()) || "Failed to fetch transactions";
      throw new Error(errorMessage);
    }

    const data: TransactionsApiResponse = await response.json();

    // Check if response is directly an array
    if (Array.isArray(data)) {
      return data;
    }

    // Check data.data.transactions
    if (Array.isArray(data?.data?.transactions)) {
      return data.data.transactions;
    }

    // Check data.transactions
    if (Array.isArray(data?.transactions)) {
      return data.transactions;
    }

    // Check data.data (if it's an array)
    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Request timeout: The server took too long to respond. Please try again."
      );
    }

    // Re-throw other errors
    throw error;
  }
}
