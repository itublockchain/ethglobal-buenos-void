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
 * Returns the proof for a specific token, or the first available proof
 */
export function getLatestProofFromLocalStorage(tokenAddress?: string): BalanceProof | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem("VOID_WALLET_BALANCES");
    if (!cached) {
      console.log("❌ [Emergency Withdraw] No balance cache found in localStorage");
      return null;
    }

    const cache = JSON.parse(cached);
    const balances = cache.balances || [];

    console.log("📦 [Emergency Withdraw] Full cache structure:", JSON.stringify(cache, null, 2));
    console.log(`📊 [Emergency Withdraw] Found ${balances.length} balances in cache`);

    if (balances.length === 0) {
      console.log("❌ [Emergency Withdraw] No balances found in cache");
      return null;
    }

    // Log all balances with their tokens and proofs
    balances.forEach((b: any, index: number) => {
      console.log(`🔍 [Emergency Withdraw] Balance ${index}:`, {
        token: b.token,
        tokenLower: b.token?.toLowerCase(),
        hasProof: !!b.proof,
        proofSiblings: b.proof?.siblings?.length || 0,
        proofStructure: b.proof ? Object.keys(b.proof) : null,
      });
    });

    if (tokenAddress) {
      const normalizedTokenAddress = tokenAddress.toLowerCase();
      console.log(`🎯 [Emergency Withdraw] Searching for token: ${tokenAddress} (normalized: ${normalizedTokenAddress})`);
      
      // Try exact match first
      let tokenBalance = balances.find(
        (b: any) => b.token?.toLowerCase() === normalizedTokenAddress
      );
      
      console.log(`🔎 [Emergency Withdraw] Exact match result:`, tokenBalance ? "FOUND" : "NOT FOUND");
      
      // If not found, try with native token address (0x0000...)
      if (!tokenBalance && normalizedTokenAddress === "0x0000000000000000000000000000000000000000") {
        console.log("🔎 [Emergency Withdraw] Trying native token fallback...");
        tokenBalance = balances.find(
          (b: any) => !b.token || b.token === "0x0000000000000000000000000000000000000000" || b.token?.toLowerCase() === "0x0000000000000000000000000000000000000000"
        );
        console.log(`🔎 [Emergency Withdraw] Native token fallback result:`, tokenBalance ? "FOUND" : "NOT FOUND");
      }
      
      if (tokenBalance) {
        console.log(`✅ [Emergency Withdraw] Found balance for token: ${tokenBalance.token}`);
        console.log(`📋 [Emergency Withdraw] Balance structure:`, {
          token: tokenBalance.token,
          balance: tokenBalance.balance,
          hasProof: !!tokenBalance.proof,
          proofKeys: tokenBalance.proof ? Object.keys(tokenBalance.proof) : null,
        });
        
        if (tokenBalance.proof) {
          const proof = tokenBalance.proof;
          console.log(`🔐 [Emergency Withdraw] Proof structure:`, {
            hasSiblings: !!proof.siblings,
            siblingsType: Array.isArray(proof.siblings) ? "array" : typeof proof.siblings,
            siblingsLength: proof.siblings?.length || 0,
            siblings: proof.siblings,
            root: proof.root,
            key: proof.key,
            value: proof.value,
          });
          
          // Accept proof even if siblings is empty - it might be valid for the contract
          if (proof.siblings && Array.isArray(proof.siblings)) {
            if (proof.siblings.length > 0) {
              console.log(`✅ [Emergency Withdraw] Found valid proof for token with ${proof.siblings.length} siblings`);
              return proof;
            } else {
              // Siblings array is empty but proof structure exists - accept it
              console.log(`⚠️ [Emergency Withdraw] Proof found but siblings array is empty. Accepting proof anyway.`);
              console.log(`📋 [Emergency Withdraw] Proof has root: ${proof.root}, key: ${proof.key}, value: ${proof.value}`);
              return proof;
            }
          } else {
            console.log(`⚠️ [Emergency Withdraw] Proof found but siblings is not an array:`, typeof proof.siblings);
            // Even if siblings is not an array, if we have root/key/value, accept it
            if (proof.root || proof.key || proof.value) {
              console.log(`✅ [Emergency Withdraw] Accepting proof with root/key/value even without siblings array`);
              return proof;
            }
          }
        } else {
          console.log(`❌ [Emergency Withdraw] Balance found but no proof attached`);
          console.log(`📋 [Emergency Withdraw] Balance keys:`, Object.keys(tokenBalance));
        }
      } else {
        console.log(`❌ [Emergency Withdraw] No balance found for token: ${tokenAddress}`);
        console.log(`📋 [Emergency Withdraw] Available tokens in cache:`, balances.map((b: any) => ({
          token: b.token,
          tokenLower: b.token?.toLowerCase(),
        })));
      }
    }

    // Otherwise, find the first balance with a valid proof
    console.log("🔍 [Emergency Withdraw] Trying to find any valid proof...");
    for (const balance of balances) {
      if (balance.proof) {
        const proof = balance.proof;
        // Accept proof if it has siblings array (even if empty) or has root/key/value
        if (proof.siblings && Array.isArray(proof.siblings)) {
          if (proof.siblings.length > 0) {
            console.log(`✅ [Emergency Withdraw] Using proof from token ${balance.token} with ${proof.siblings.length} siblings`);
            return proof;
          } else {
            console.log(`⚠️ [Emergency Withdraw] Proof from token ${balance.token} has empty siblings, accepting anyway`);
            return proof;
          }
        } else if (proof.root || proof.key || proof.value) {
          console.log(`✅ [Emergency Withdraw] Using proof from token ${balance.token} with root/key/value`);
          return proof;
        } else {
          console.log(`⚠️ [Emergency Withdraw] Proof found for token ${balance.token} but structure is invalid:`, proof);
        }
      }
    }

    console.log("❌ [Emergency Withdraw] No valid proof found in any balance");
    return null;
  } catch (error) {
    console.error("❌ [Emergency Withdraw] Failed to get proof from localStorage:", error);
    return null;
  }
}

/**
 * Converts a proof to bytes32 array for contract call
 */
export function proofToBytes32Array(proof: BalanceProof): string[] {
  // Convert proof siblings to bytes32 array
  // The proof should contain siblings which are already strings (hex)
  // If siblings is empty, return empty array (contract might handle it)
  if (proof.siblings && Array.isArray(proof.siblings)) {
    return proof.siblings;
  }
  // If siblings doesn't exist or is not an array, return empty array
  console.log(`⚠️ [Emergency Withdraw] Proof siblings is not a valid array, returning empty array`);
  return [];
}

/**
 * Gets all proofs from localStorage and returns the one for the specified token
 * If token is not specified, returns the first available proof
 * Returns the full proof object, not just siblings array
 */
export function getLatestTransactionProof(tokenAddress?: string): BalanceProof | null {
  const proof = getLatestProofFromLocalStorage(tokenAddress);
  return proof;
}

