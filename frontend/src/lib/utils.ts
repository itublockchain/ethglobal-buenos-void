import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAddress } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTokenLogoUrl(address: string): string {
  try {
    // ETH Address (Zero Address)
    if (address === "0x0000000000000000000000000000000000000000") {
      return "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png";
    }

    // Ensure checksum address format
    const checksumAddress = getAddress(address);
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksumAddress}/logo.png`;
  } catch {
    // If address is invalid, return empty string or default placeholder logic can handle it
    return "";
  }
}
