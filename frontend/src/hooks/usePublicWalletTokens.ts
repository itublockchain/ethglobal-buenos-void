import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { type Address, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";
import { formatTokenBalance } from "@/components/WalletDashboard/utils";
import { VOID_CONTRACT_ADDRESS } from "@/components/WalletDashboard/constants";
import { fetchMultipleTokenMetadata } from "@/lib/token-metadata";
import { readPersistedAuthToken, decodeJWT } from "@/lib/sign/auth";

export type TokenBalance = {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
  formattedBalance: string;
  name?: string;
  logo?: string;
};

/**
 * Hook to automatically fetch ERC20 token balances from user's public wallet (Void Wallet)
 * Uses Alchemy API to discover tokens in the public wallet address on Base Sepolia
 */
export function usePublicWalletTokens() {
  const { address: connectedAddress } = useAccount();
  const [publicWalletAddress, setPublicWalletAddress] =
    useState<Address | null>(null);
  const [discoveredTokens, setDiscoveredTokens] = useState<Address[]>([]);
  const [tokenLogos, setTokenLogos] = useState<Map<string, string>>(new Map());
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get public wallet address from JWT token
  useEffect(() => {
    const token = readPersistedAuthToken();
    if (token) {
      const payload = decodeJWT(token);
      if (payload?.wallet) {
        setPublicWalletAddress(payload.wallet as Address);
      } else {
        setPublicWalletAddress(null);
      }
    } else {
      setPublicWalletAddress(null);
    }
  }, [refreshTrigger]);

  // Discover all tokens in public wallet automatically using Alchemy
  useEffect(() => {
    if (!publicWalletAddress) {
      setDiscoveredTokens([]);
      setTokenLogos(new Map());
      return;
    }

    const discoverTokens = async () => {
      setIsDiscovering(true);
      try {
        const url = `/api/discover-tokens?walletAddress=${encodeURIComponent(
          publicWalletAddress
        )}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.status}`);
        }

        const data = await response.json();
        const tokens = data.tokens || [];
        setDiscoveredTokens(tokens);
      } catch (err) {
        console.error("Failed to discover tokens:", err);
        setDiscoveredTokens([]);
        setError("Failed to discover tokens");
      } finally {
        setIsDiscovering(false);
      }
    };

    discoverTokens();
  }, [publicWalletAddress, refreshTrigger]);

  // Fetch detailed info for discovered tokens
  // Token list comes from public wallet (discovered via Alchemy)
  // But balance and allowance come from connected wallet (user deposits from their own wallet)
  const { data: tokenData, isLoading: isLoadingDetails } = useReadContracts({
    contracts: discoveredTokens.flatMap((tokenAddress) => [
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "symbol",
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [connectedAddress || publicWalletAddress!],
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [connectedAddress || publicWalletAddress!, VOID_CONTRACT_ADDRESS],
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "name",
        chainId: baseSepolia.id,
      },
    ]),
    query: {
      enabled:
        !!publicWalletAddress &&
        discoveredTokens.length > 0 &&
        !!connectedAddress,
    },
  });

  // Fetch logos from CoinGecko once we have symbols
  useEffect(() => {
    if (!tokenData || isLoadingDetails) return;

    const fetchLogos = async () => {
      setIsDiscovering(true);

      try {
        const tokensWithSymbols = discoveredTokens
          .map((tokenAddress, index) => {
            const baseIndex = index * 5;
            const symbolResult = tokenData[baseIndex];

            if (symbolResult?.status === "success") {
              return {
                address: tokenAddress,
                symbol: symbolResult.result as string,
              };
            }
            return null;
          })
          .filter((t): t is { address: Address; symbol: string } => t !== null);

        const metadata = await fetchMultipleTokenMetadata(tokensWithSymbols);

        const logos = new Map<string, string>();
        metadata.forEach((meta, tokenAddress) => {
          if (meta.logo) {
            logos.set(tokenAddress.toLowerCase(), meta.logo);
          }
        });

        setTokenLogos(logos);
      } catch {
        // Silently fail, fallback logos will be used
      } finally {
        setIsDiscovering(false);
      }
    };

    fetchLogos();
  }, [tokenData, isLoadingDetails, discoveredTokens]);

  // Build final token list with all details
  const seenAddresses = new Set<string>();
  const tokens = discoveredTokens
    .map((tokenAddress, index) => {
      const baseIndex = index * 5;
      const lowerAddress = tokenAddress.toLowerCase();

      // Skip duplicates
      if (seenAddresses.has(lowerAddress)) {
        return null;
      }
      seenAddresses.add(lowerAddress);

      if (!tokenData) return null;

      const symbolResult = tokenData[baseIndex];
      const decimalsResult = tokenData[baseIndex + 1];
      const balanceResult = tokenData[baseIndex + 2];
      const allowanceResult = tokenData[baseIndex + 3];
      const nameResult = tokenData[baseIndex + 4];

      // Get balance first to check if we should skip
      const balance =
        balanceResult?.status === "success"
          ? (balanceResult.result as bigint)
          : 0n;

      // Skip tokens with zero balance early
      if (balance === 0n) return null;

      // Handle missing symbol/decimals gracefully
      let symbol = "UNKNOWN";
      let decimals = 18;
      let name = "Unknown Token";

      if (symbolResult?.status === "success") {
        symbol = (symbolResult.result as string) || "UNKNOWN";
      }

      if (decimalsResult?.status === "success") {
        decimals = (decimalsResult.result as number) || 18;
      }

      if (nameResult?.status === "success") {
        name = (nameResult.result as string) || symbol;
      }

      const allowance =
        allowanceResult?.status === "success"
          ? (allowanceResult.result as bigint)
          : 0n;

      // Get logo from CoinGecko metadata
      const logo = tokenLogos.get(lowerAddress);

      return {
        address: tokenAddress,
        symbol,
        decimals,
        balance,
        allowance,
        formattedBalance: formatTokenBalance(balance, decimals),
        name,
        logo, // Logo from CoinGecko or undefined (will fallback to getTokenLogoUrl)
      };
    })
    .filter((token) => token !== null) as TokenBalance[];

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return {
    tokens,
    isLoading: isDiscovering || isLoadingDetails,
    error,
    refresh,
  };
}
