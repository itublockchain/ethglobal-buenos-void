import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { type Address, erc20Abi } from "viem";
import { baseSepolia } from "viem/chains";
import { formatTokenBalance } from "@/components/WalletDashboard/utils";
import { VOID_CONTRACT_ADDRESS } from "@/components/WalletDashboard/constants";
import { fetchMultipleTokenMetadata } from "@/lib/token-metadata";

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
 * Hook to automatically fetch ERC20 token balances from user's public wallet
 * Uses known Base Sepolia testnet tokens and fetches data on-chain
 * TODO: In production, fetch token list from backend API for better security
 */
export function usePublicWalletTokens() {
  const { address } = useAccount();
  const [discoveredTokens, setDiscoveredTokens] = useState<Address[]>([]);
  const [tokenLogos, setTokenLogos] = useState<Map<string, string>>(new Map());
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize known tokens
  useEffect(() => {
    if (!address) {
      setDiscoveredTokens([]);
      setTokenLogos(new Map());
      return;
    }

    // Use known Base Sepolia testnet tokens
    const knownTokens = [
      "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC
      "0x808456652fdb597867f38412077A9182bf77359F", // EURC
    ] as Address[];

    setDiscoveredTokens(knownTokens);
  }, [address]);

  // Fetch detailed info for discovered tokens
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
        args: [address!],
        chainId: baseSepolia.id,
      },
      {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address!, VOID_CONTRACT_ADDRESS],
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
      enabled: !!address && discoveredTokens.length > 0,
    },
  });

  // Fetch logos from CoinGecko once we have symbols
  useEffect(() => {
    if (!tokenData || isLoadingDetails) return;

    const fetchLogos = async () => {
      setIsDiscovering(true);

      try {
        // Build array of { address, symbol } for CoinGecko
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

        // Fetch logos from CoinGecko via Server Action (with cache)
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

      // Get logo from Alchemy metadata
      const logo = tokenLogos.get(lowerAddress);

      return {
        address: tokenAddress,
        symbol,
        decimals,
        balance,
        allowance,
        formattedBalance: formatTokenBalance(balance, decimals),
        name,
        logo, // Logo from Alchemy or undefined (will fallback to getTokenLogoUrl)
      };
    })
    .filter((token) => token !== null) as TokenBalance[];

  return {
    tokens,
    isLoading: isDiscovering || isLoadingDetails,
    error,
  };
}
