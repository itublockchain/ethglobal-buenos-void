"use server";

export type TokenMetadata = {
  symbol?: string;
  name?: string;
  decimals?: number;
  logo?: string;
};

// In-memory cache for token metadata (24 hour TTL)
const metadataCache = new Map<
  string,
  { metadata: TokenMetadata; timestamp: number }
>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch token metadata from CoinGecko API by symbol
 * Uses search endpoint to find token by symbol, then gets details
 */
async function fetchMetadataFromCoinGecko(
  symbol: string
): Promise<TokenMetadata | null> {
  if (!symbol) {
    return null;
  }

  try {
    // Search for token by symbol
    const searchResponse = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(
        symbol.toUpperCase()
      )}`,
      {
        // Cache for 24 hours
        next: { revalidate: 86400 },
      }
    );

    if (!searchResponse.ok) {
      return null;
    }

    const searchData = await searchResponse.json();

    // Find the best match (prefer coins over tokens, prefer higher market cap)
    const coins = searchData.coins || [];
    if (coins.length === 0) {
      return null;
    }

    // Get the first coin (usually the most popular one)
    const coinId = coins[0]?.id;
    if (!coinId) {
      return null;
    }

    // Get detailed coin information
    const detailResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
      {
        next: { revalidate: 86400 },
      }
    );

    if (!detailResponse.ok) {
      return null;
    }

    const detailData = await detailResponse.json();

    // Get logo from image object
    const logo =
      detailData.image?.large ||
      detailData.image?.small ||
      detailData.image?.thumb ||
      undefined;

    // Get decimals from platform details (prefer Base, then Ethereum)
    const decimals =
      detailData.detail_platforms?.base?.decimal_place ||
      detailData.detail_platforms?.ethereum?.decimal_place ||
      undefined;

    return {
      name: detailData.name || undefined,
      symbol: detailData.symbol?.toUpperCase() || symbol.toUpperCase(),
      decimals: decimals,
      logo: logo,
    };
  } catch (error) {
    console.error("Failed to fetch token metadata from CoinGecko:", error);
    return null;
  }
}

/**
 * Fetch token metadata from Alchemy API
 * Uses alchemy_getTokenMetadata endpoint to get name, symbol, decimals, and logo
 */
async function fetchMetadataFromAlchemy(
  tokenAddress: string
): Promise<TokenMetadata | null> {
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;

  if (!alchemyApiKey) {
    return null;
  }

  try {
    const alchemyUrl = `https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

    const response = await fetch(alchemyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [tokenAddress],
        id: 1,
      }),
      // Cache for 24 hours
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.error) {
      return null;
    }

    const result = data.result;

    return {
      name: result.name || undefined,
      symbol: result.symbol || undefined,
      decimals: result.decimals !== null ? result.decimals : undefined,
      logo: result.logo || undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch token metadata with logo from CoinGecko (primary) and Alchemy (fallback)
 * Uses symbol for CoinGecko search, address for Alchemy
 * Uses in-memory cache to avoid repeated API calls
 */
export async function fetchTokenMetadata(
  tokenAddress: string,
  symbol?: string
): Promise<TokenMetadata | null> {
  // Use address as cache key to ensure each token address has its own cache entry
  const cacheKey = tokenAddress.toLowerCase();
  const now = Date.now();

  // Check cache first
  const cached = metadataCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.metadata;
  }

  try {
    let metadata: TokenMetadata | null = null;

    // Try CoinGecko first using symbol (better logos and metadata)
    if (symbol) {
      metadata = await fetchMetadataFromCoinGecko(symbol);
    }

    // Fallback to Alchemy if CoinGecko fails or no symbol provided
    if (!metadata || !metadata.logo) {
      const alchemyMetadata = await fetchMetadataFromAlchemy(tokenAddress);
      if (alchemyMetadata) {
        // Merge: prefer CoinGecko data, but use Alchemy if CoinGecko missing fields
        metadata = {
          ...metadata,
          ...alchemyMetadata,
          logo: metadata?.logo || alchemyMetadata.logo,
        };
      } else if (!metadata) {
        // If both failed, use symbol as fallback
        metadata = symbol ? { symbol: symbol.toUpperCase() } : null;
      }
    }

    // Cache the result by address
    if (metadata) {
      metadataCache.set(cacheKey, {
        metadata,
        timestamp: now,
      });
    }

    return metadata;
  } catch (error) {
    console.error("Error in fetchTokenMetadata:", error);
    return null;
  }
}

/**
 * Fetch metadata for multiple tokens in parallel
 * Uses Alchemy API for all tokens
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
