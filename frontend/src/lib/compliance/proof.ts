import { UltraHonkBackend } from "@aztec/bb.js";
import circuit from "@/app/demo/compliance/circuits/lower.json";
import {
  keccak256,
  concat,
  getBytes,
  toBeHex,
  zeroPadValue,
  hashMessage,
  getAddress,
  Wallet,
} from "ethers";
import { Noir } from "@noir-lang/noir_js";

export function addressToBytes(address: string): number[] {
  const checksumAddress = getAddress(address);
  return Array.from(getBytes(checksumAddress));
}

export function bigIntToU8Array(value: bigint, length: number): Uint8Array {
  const hex = value.toString(16).padStart(length * 2, "0");
  return getBytes(`0x${hex}`);
}

export function createTransferKey(
  prover_address: string,
  countryparty_address: string,
  token_address: string,
  signature: string
): string {
  const proverBytes = addressToBytes(prover_address);
  const counterpartyBytes = addressToBytes(countryparty_address);
  const tokenBytes = addressToBytes(token_address);
  const sigHash = keccak256(getBytes(signature.slice(0, 130)));

  const encoded = new Uint8Array(92);
  encoded.set(proverBytes, 0);
  encoded.set(counterpartyBytes, 20);
  encoded.set(tokenBytes, 40);
  encoded.set(getBytes(sigHash), 60);

  return keccak256(encoded);
}

export function createWalletInformationForTransfer(
  hashed_message: string,
  signature: string
): { x: number[]; y: number[] } {
  const sigBytes = getBytes(signature);
  const xBytes = sigBytes.slice(0, 32);
  const yBytes = sigBytes.slice(32, 64);

  return {
    x: Array.from(xBytes),
    y: Array.from(yBytes),
  };
}

export async function createLowerProof(
  values: bigint[],
  leaf_hash: string,
  pairwise_value: bigint,
  signature: string,
  hashed_message: string,
  prover_address: string,
  countryparty_address: string,
  token_address: string
): Promise<{
  proof: string;
  publicInputs: any;
  isValid: boolean;
  returnValue: any;
}> {
  const key = createTransferKey(
    prover_address,
    countryparty_address,
    token_address,
    signature
  );

  const { x, y } = createWalletInformationForTransfer(
    hashed_message,
    signature
  );

  const proverPartyAddressBytes = addressToBytes(prover_address);
  const counterPartyAddressBytes = addressToBytes(countryparty_address);
  const tokenAddressBytes = addressToBytes(token_address);

  // Convert values array to the format expected by the circuit
  // Circuit expects: value: [[u8; 32]; 50]
  const array_values: number[][] = Array.from({ length: 50 }, (_, i) => {
    if (i < values.length) {
      return Array.from(bigIntToU8Array(values[i], 32));
    } else {
      // Pad with zeros for unused slots
      return Array.from({ length: 32 }, () => 0);
    }
  });

  // Prepare inputs according to circuit ABI
  const privateInputs = {
    value: array_values,
    size: values.length,
    pub_key_x: x,
    pub_key_y: y,
    signature: Array.from(getBytes(signature.slice(0, 130))),
    hashed_message: Array.from(getBytes(hashed_message)),
  };

  // Public inputs according to circuit ABI
  const publicInputs = {
    leaf_hash: Array.from(getBytes(leaf_hash)),
    pairwise_value_bytes: Array.from(bigIntToU8Array(pairwise_value, 32)),
    prover_address: proverPartyAddressBytes,
    countryparty_address: counterPartyAddressBytes,
    token_address: tokenAddressBytes,
    key: Array.from(getBytes(key)),
  };

  try {
    // Get bytecode from circuit - it's already base64 encoded
    const bytecodeBase64 = (circuit as any).bytecode;

    // UltraHonkBackend expects bytecode as base64 string
    // The bytecode in circuit JSON is already base64 encoded and may be gzip compressed
    // Try to decompress if it's gzip, otherwise use directly
    let bytecode: string;
    try {
      const bytecodeBytes = Uint8Array.from(atob(bytecodeBase64), (c) =>
        c.charCodeAt(0)
      );

      // Check if it's gzip compressed (starts with 0x1f 0x8b)
      const isGzip =
        bytecodeBytes.length >= 2 &&
        bytecodeBytes[0] === 0x1f &&
        bytecodeBytes[1] === 0x8b;

      if (isGzip) {
        try {
          // Decompress gzip
          const decompressed = await new Response(
            new Blob([bytecodeBytes])
              .stream()
              .pipeThrough(new DecompressionStream("gzip"))
          ).arrayBuffer();
          const bytecodeArray = new Uint8Array(decompressed);

          // Convert decompressed bytecode to base64
          const blob = new Blob([bytecodeArray]);
          bytecode = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (gzipError) {
          // If gzip decompression fails, use the original bytecode
          console.warn(
            "Gzip decompression failed, using bytecode directly:",
            gzipError
          );
          bytecode = bytecodeBase64;
        }
      } else {
        // Not gzip compressed, use directly
        bytecode = bytecodeBase64;
      }
    } catch (error) {
      // If any error occurs, use the bytecode directly
      console.warn("Bytecode processing failed, using directly:", error);
      bytecode = bytecodeBase64;
    }

    // Initialize Noir with circuit
    const noir = new Noir(circuit as any);
    await noir.init();

    // Initialize backend
    const backend = new UltraHonkBackend(bytecode, { threads: 2 });

    // Prepare inputs (combine private and public)
    const inputs = {
      ...privateInputs,
      ...publicInputs,
    };

    // Execute circuit to get witness
    const execResult = await noir.execute(inputs);

    // Generate proof
    const proofData = await backend.generateProof(execResult.witness);

    // Verify proof locally
    const isValid = await backend.verifyProof(proofData);

    // Convert proof to base64 string for storage
    // Use Blob/FileReader to avoid stack overflow with large proofs
    const proofArray = new Uint8Array(proofData.proof);
    const proofBlob = new Blob([proofArray]);
    const proofString = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(proofBlob);
    });

    return {
      proof: proofString,
      publicInputs: proofData.publicInputs,
      isValid,
      returnValue: null,
    };
  } catch (error) {
    console.error("Proof generation error:", error);
    throw new Error(
      `Failed to generate proof: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function verifyProof(
  proof: string | Uint8Array,
  publicInputs: any
): Promise<boolean> {
  try {
    // Get bytecode from circuit - it's already base64 encoded
    const bytecodeBase64 = (circuit as any).bytecode;

    // UltraHonkBackend expects bytecode as base64 string
    // The bytecode in circuit JSON is already base64 encoded and may be gzip compressed
    // Try to decompress if it's gzip, otherwise use directly
    let bytecode: string;
    try {
      const bytecodeBytes = Uint8Array.from(atob(bytecodeBase64), (c) =>
        c.charCodeAt(0)
      );

      // Check if it's gzip compressed (starts with 0x1f 0x8b)
      const isGzip =
        bytecodeBytes.length >= 2 &&
        bytecodeBytes[0] === 0x1f &&
        bytecodeBytes[1] === 0x8b;

      if (isGzip) {
        try {
          // Decompress gzip
          const decompressed = await new Response(
            new Blob([bytecodeBytes])
              .stream()
              .pipeThrough(new DecompressionStream("gzip"))
          ).arrayBuffer();
          const bytecodeArray = new Uint8Array(decompressed);

          // Convert decompressed bytecode to base64
          const blob = new Blob([bytecodeArray]);
          bytecode = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (gzipError) {
          // If gzip decompression fails, use the original bytecode
          console.warn(
            "Gzip decompression failed, using bytecode directly:",
            gzipError
          );
          bytecode = bytecodeBase64;
        }
      } else {
        // Not gzip compressed, use directly
        bytecode = bytecodeBase64;
      }
    } catch (error) {
      // If any error occurs, use the bytecode directly
      console.warn("Bytecode processing failed, using directly:", error);
      bytecode = bytecodeBase64;
    }

    // Initialize backend
    const backend = new UltraHonkBackend(bytecode, { threads: 2 });

    // Convert proof to ProofData format
    let proofData: { proof: Uint8Array; publicInputs: any };
    if (typeof proof === "string") {
      // If proof is a string, we need to reconstruct the ProofData object
      // This assumes the proof was stored as base64 and publicInputs are passed separately
      const proofBytes = Uint8Array.from(atob(proof), (c) => c.charCodeAt(0));
      proofData = {
        proof: proofBytes,
        publicInputs,
      };
    } else if (Array.isArray(proof)) {
      proofData = {
        proof: Uint8Array.from(proof),
        publicInputs,
      };
    } else {
      // Assume it's already a ProofData object
      proofData = proof as any;
    }

    // Verify proof
    const isValid = await backend.verifyProof(proofData);

    return isValid;
  } catch (error) {
    console.error("Proof verification error:", error);
    return false;
  }
}
