import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get token logo URL from public folder based on token address
 * Returns empty string if token is not found
 */
export function getTokenLogoUrl(tokenAddress: string): string {
  if (!tokenAddress) return "";

  // Native ETH (zero address or empty)
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  if (
    tokenAddress.toLowerCase() === zeroAddress.toLowerCase() ||
    tokenAddress === ""
  ) {
    return "/ETH.png";
  }

  // Known token addresses on Base Sepolia
  const tokenMap: Record<string, string> = {
    "0x036cbd53842c5426634e7929541ec2318f3dcf7e": "/USDC.png", // USDC
    "0x808456652fdb597867f38412077a9182bf77359f": "/EURC.png", // EURC (if exists)
  };

  const lowerAddress = tokenAddress.toLowerCase();
  const logoPath = tokenMap[lowerAddress];

  return logoPath || "";
}
