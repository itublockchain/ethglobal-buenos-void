import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { concat, getBytes, keccak256, SigningKey } from "ethers";

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

export function createWalletInformationForTransfer(
  digest: string,
  sig: string
) {
  const pubkeyUncompressed = SigningKey.recoverPublicKey(digest, sig);
  const hex = pubkeyUncompressed.slice(2); // Remove "0x04" prefix
  const xHex = "0x" + hex.substring(2, 66);
  const yHex = "0x" + hex.substring(66, 130);
  const x = Array.from(getBytes(xHex));
  const y = Array.from(getBytes(yHex));
  return { x, y };
}

export function bigIntToU8Array(value: bigint, byteLength: number) {
  if (typeof value !== "bigint") {
    throw new TypeError("value must be a BigInt"); // :contentReference[oaicite:0]{index=0}
  }
  if (value < 0n) {
    throw new RangeError("Cannot convert negative BigInt to bytes"); // :contentReference[oaicite:1]{index=1}
  }

  // Pre-allocate the output
  const bytes = []; // :contentReference[oaicite:2]{index=2}

  // Fill from the end (least significant byte) backwards
  let temp = value;
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn); // :contentReference[oaicite:3]{index=3}
    temp >>= 8n;
  }

  if (temp !== 0n) {
    throw new RangeError("BigInt too large to fit in byteLength"); // :contentReference[oaicite:4]{index=4}
  }

  return bytes;
}

export function createTransferKey(
  sender: string,
  receiver: string,
  tokenAddress: string,
  signature: string
): string {
  const signatureBytes = getBytes(signature.slice(0, 130));
  const nonce = keccak256(signatureBytes);
  const senderBytes = getBytes(sender);
  const receiverBytes = getBytes(receiver);
  const tokenBytes = getBytes(tokenAddress);
  const nonceBytes = getBytes(nonce);
  const combined = concat([senderBytes, receiverBytes, tokenBytes, nonceBytes]);
  const balanceKey = keccak256(combined);
  return balanceKey;
}
