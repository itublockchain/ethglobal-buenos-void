const AUTH_TOKEN_STORAGE_KEY = "VOID_AUTH_TOKEN";
const BALANCE_CACHE_KEY = "VOID_WALLET_BALANCES";
const CACHE_VERSION = "v1";

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

export type BalanceProof = {
  root: string;
  siblings: string[];
  key: string;
  value: string;
};

export type TokenBalance = {
  token: string;
  balance: string;
  decimals?: number;
  symbol?: string;
  proof: BalanceProof;
};

export type BalanceResponse = {
  address: string;
  balances: TokenBalance[];
};

type BalanceCache = {
  version: string;
  address: string;
  balances: TokenBalance[];
  timestamp: number;
};

/**
 * Get cached balances from localStorage
 */
function getCachedBalances(address: string): TokenBalance[] | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(BALANCE_CACHE_KEY);
    if (!cached) return null;

    const cache: BalanceCache = JSON.parse(cached);

    // Check version and address match
    if (cache.version !== CACHE_VERSION || cache.address.toLowerCase() !== address.toLowerCase()) {
      localStorage.removeItem(BALANCE_CACHE_KEY);
      return null;
    }

    // Cache valid for 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - cache.timestamp > fiveMinutes) {
      return null;
    }

    return cache.balances;
  } catch {
    return null;
  }
}

/**
 * Save balances to localStorage
 */
function cacheBalances(address: string, balances: TokenBalance[]): void {
  if (typeof window === "undefined") return;

  try {
    const cache: BalanceCache = {
      version: CACHE_VERSION,
      address: address.toLowerCase(),
      balances,
      timestamp: Date.now(),
    };

    localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail if localStorage is full
  }
}

/**
 * Clear balance cache
 */
export function clearBalanceCache(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(BALANCE_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Fetches wallet balances from the backend with localStorage cache
 * Cache is stored for 5 minutes and includes ZK proofs
 */
export async function fetchWalletBalances(forceRefresh = false): Promise<BalanceResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("No authentication token found. Please sign in first.");
  }

  // Try to get wallet address from token (jwt decode)
  let walletAddress: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    walletAddress = payload.wallet;
  } catch {
    // If we can't decode, we'll fetch from API
  }

  // Check cache if not forcing refresh and we have wallet address
  if (!forceRefresh && walletAddress) {
    const cached = getCachedBalances(walletAddress);
    if (cached) {
      return {
        address: walletAddress,
        balances: cached,
      };
    }
  }

  // Fetch from API
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const baseUrl = process.env.NEXT_PUBLIC_VOID_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_VOID_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/api/balance`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorMessage =
      (await response.text()) || "Failed to fetch balances";
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract response data
  const responseData = data.data || data;
  const address = responseData.wallet || responseData.address || walletAddress;
  const balances = responseData.balances || [];

  // Cache the balances with proofs
  if (address && balances.length > 0) {
    cacheBalances(address, balances);
  }

  return {
    address: address || "",
    balances,
  };
}

