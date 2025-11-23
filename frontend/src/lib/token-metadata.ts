"use server";

export type TokenMetadata = {
  symbol?: string;
  name?: string;
  decimals?: number;
  logo?: string;
};

// Cache key for localStorage
const LOGO_CACHE_KEY = "token_logos_cache";
const CACHE_VERSION = "v1";

// Cache structure
type LogoCache = {
  version: string;
  logos: Record<string, { url: string; timestamp: number }>;
};

/**
 * Get cached logo if available and not expired (7 days)
 */
function getCachedLogo(symbol: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(LOGO_CACHE_KEY);
    if (!cached) return null;

    const cache: LogoCache = JSON.parse(cached);
    if (cache.version !== CACHE_VERSION) {
      localStorage.removeItem(LOGO_CACHE_KEY);
      return null;
    }

    const symbolLower = symbol.toLowerCase();
    const entry = cache.logos[symbolLower];

    if (!entry) return null;

    // Check if cache is still valid (7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > sevenDays) {
      return null;
    }

    return entry.url;
  } catch {
    return null;
  }
}

/**
 * Cache logo URL for symbol
 */
function cacheLogo(symbol: string, url: string): void {
  if (typeof window === "undefined") return;

  try {
    const cached = localStorage.getItem(LOGO_CACHE_KEY);
    const cache: LogoCache = cached
      ? JSON.parse(cached)
      : { version: CACHE_VERSION, logos: {} };

    cache.logos[symbol.toLowerCase()] = {
      url,
      timestamp: Date.now(),
    };

    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

/**
 * Fetch token logo from CoinGecko API by symbol
 * CoinGecko has a free public API, no key needed
 */
async function fetchLogoFromCoinGecko(symbol: string): Promise<string | null> {
  // Check cache first (client-side only)
  const cachedLogo = getCachedLogo(symbol);
  if (cachedLogo) {
    return cachedLogo;
  }

  try {
    // CoinGecko search endpoint
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(
      symbol
    )}`;

    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
      },
      // Cache for 24 hours (logos don't change often)
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Find exact symbol match (case insensitive)
    const coin = data.coins?.find(
      (c: any) => c.symbol?.toLowerCase() === symbol.toLowerCase()
    );

    if (coin?.large) {
      const logoUrl = coin.large;
      // Cache the logo
      cacheLogo(symbol, logoUrl);
      return logoUrl;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch token metadata with logo from CoinGecko (server-side only)
 * Takes symbol from on-chain data and fetches logo from CoinGecko
 */
export async function fetchTokenMetadata(
  tokenAddress: string,
  symbol?: string
): Promise<TokenMetadata | null> {
  try {
    // If we have symbol, fetch logo from CoinGecko
    let logo: string | undefined;

    if (symbol) {
      const coinGeckoLogo = await fetchLogoFromCoinGecko(symbol);
      if (coinGeckoLogo) {
        logo = coinGeckoLogo;
      }
    }

    return {
      symbol,
      logo,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch metadata for multiple tokens in parallel
 * Now uses CoinGecko API based on token symbols
 */
export async function fetchMultipleTokenMetadata(
  tokens: Array<{ address: string; symbol?: string }>
): Promise<Map<string, TokenMetadata>> {
  const results = await Promise.all(
    tokens.map(async ({ address, symbol }) => {
      const metadata = await fetchTokenMetadata(address, symbol);
      return { address: address.toLowerCase(), metadata };
    })
  );

  const metadataMap = new Map<string, TokenMetadata>();
  results.forEach(({ address, metadata }) => {
    if (metadata) {
      metadataMap.set(address, metadata);
    }
  });

  return metadataMap;
}
