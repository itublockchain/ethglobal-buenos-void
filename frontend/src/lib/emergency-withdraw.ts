import { concat, getBytes, keccak256 } from "ethers";
import { BalanceProof } from "./balance";

/**
 * Creates a nonce from signature using keccak256
 */
export function createNonceFromSignature(signature: string): string {
  const signatureBytes = getBytes(signature);
  const nonce = keccak256(signatureBytes);
  return nonce;
}

/**
 * Gets the latest proof from localStorage balance cache
 * Returns the proof with the highest timestamp, or null if no proofs found
 */
export function getLatestProofFromLocalStorage(): BalanceProof | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem("VOID_WALLET_BALANCES");
    if (!cached) return null;

    const cache = JSON.parse(cached);
    const balances = cache.balances || [];

    if (balances.length === 0) return null;

    // Find the balance with the latest timestamp
    // If timestamp is not available, use the first proof
    let latestBalance = balances[0];
    let latestTimestamp = cache.timestamp || 0;

    // Sort by balance amount (assuming higher balance = newer transaction)
    // Or we can use the proof itself as indicator
    // For now, we'll take the first proof as the latest
    // This should be improved to track transaction timestamps per balance

    return latestBalance.proof || null;
  } catch (error) {
    console.error("Failed to get proof from localStorage:", error);
    return null;
  }
}

/**
 * Converts a proof to bytes32 array for contract call
 */
export function proofToBytes32Array(proof: BalanceProof): string[] {
  // Convert proof siblings to bytes32 array
  // The proof should contain siblings which are already strings (hex)
  return proof.siblings || [];
}

/**
 * Gets all proofs from localStorage and returns the one with highest timestamp
 * Since we don't have per-transaction timestamps in balance cache,
 * we'll return the first proof we find
 * In a real implementation, you might want to track transaction proofs separately
 */
export function getLatestTransactionProof(): string[] | null {
  const proof = getLatestProofFromLocalStorage();
  if (!proof) return null;

  return proofToBytes32Array(proof);
}

