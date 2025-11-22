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
  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  const token = readPersistedAuthToken();

  if (!token) {
    throw new Error("No authentication token found. Please sign in first.");
  }

  const response = await fetch(`${baseUrl}/api/transactions`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorMessage =
      (await response.text()) || "Failed to fetch transactions";
    throw new Error(errorMessage);
  }

  const data: TransactionsApiResponse = await response.json();

  if (Array.isArray(data?.data?.transactions)) {
    return data.data.transactions;
  }

  if (Array.isArray(data?.transactions)) {
    return data.transactions;
  }

  return [];
}

