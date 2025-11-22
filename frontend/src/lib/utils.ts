import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAddress } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTokenLogoUrl(address: string): string {
  try {
    const lowerAddress = address.toLowerCase();

    // ETH Address (Zero Address)
    if (lowerAddress === "0x0000000000000000000000000000000000000000") {
      return "https://assets.coingecko.com/coins/images/279/small/ethereum.png";
    }

    // Base Sepolia USDC - use mainnet USDC logo from CoinGecko
    if (lowerAddress === "0x036cbd53842c5426634e7929541ec2318f3dcf7e") {
      return "https://assets.coingecko.com/coins/images/6319/small/usdc.png";
    }

    // Fallback to Trust Wallet for mainnet tokens
    const checksumAddress = getAddress(address);
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`;
  } catch {
    // If address is invalid, return empty string or default placeholder logic can handle it
    return "";
  }
}
