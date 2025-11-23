import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAddress } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get token logo URL with fallback sources
 * This is a fallback when Alchemy API doesn't return a logo
 * Priority: Known tokens (CoinGecko) > Trust Wallet > Empty
 */
export function getTokenLogoUrl(address: string): string {
  try {
    const lowerAddress = address.toLowerCase();

    // Hardcoded logos for common tokens (CoinGecko)
    // Since testnet tokens don't have logos in most APIs
    const knownLogos: Record<string, string> = {
      // ETH (native)
      "0x0000000000000000000000000000000000000000":
        "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
      // USDC (use mainnet logo as testnet placeholder)
      "0x036cbd53842c5426634e7929541ec2318f3dcf7e":
        "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
      // EURC (Circle Euro Coin)
      "0x808456652fdb597867f38412077a9182bf77359f":
        "https://assets.coingecko.com/coins/images/26045/small/euro-coin.png",
    };

    // Return known logo if available
    if (knownLogos[lowerAddress]) {
      return knownLogos[lowerAddress];
    }

    // For unknown tokens, try Trust Wallet as fallback
    const checksumAddress = getAddress(address);

    // Try multiple Trust Wallet sources
    const fallbackSources = [
      // Base chain
      `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${checksumAddress}/logo.png`,
      // Ethereum mainnet
      `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`,
    ];

    // Return first fallback - UI will handle onError
    return fallbackSources[0];
  } catch {
    return "";
  }
}

/**
 * Get multiple fallback URLs for a token logo
 * Used when primary logo fails to load
 */
export function getTokenLogoFallbacks(address: string): string[] {
  try {
    const checksumAddress = getAddress(address);
    return [
      `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`,
      `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${checksumAddress}/logo.png`,
    ];
  } catch {
    return [];
  }
}
