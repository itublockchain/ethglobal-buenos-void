import { UltraHonkBackend } from "@aztec/bb.js";
import circuit from "../app/circuit/lower.json";
import {
  bigIntToU8Array,
  createTransferKey,
  createWalletInformationForTransfer,
} from "../lib/utils";
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

export interface PublicInputs {
  leaf_hash: string; // 32 bytes hex string
  pairwise_value: bigint; // numeric value
  prover_address: string; // 20 bytes hex string (Ethereum address)
  countryparty_address: string; // 20 bytes hex string (Ethereum address)
  token_address: string; // 20 bytes hex string (Ethereum address)
  key: string; // 32 bytes hex string
}

/**
 * Structure representing the raw circuit public inputs (byte arrays)
 */
export interface RawPublicInputs {
  leaf_hash: number[]; // [u8; 32]
  pairwise_value_bytes: number[]; // [u8; 32]
  prover_address: number[]; // [u8; 20]
  countryparty_address: number[]; // [u8; 20]
  token_address: number[]; // [u8; 20]
  key: number[]; // [u8; 32]
}

export function addressToBytes(address: string) {
  const checksumAddress = getAddress(address);
  return Array.from(getBytes(checksumAddress));
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
) {
  const { x, y } = createWalletInformationForTransfer(
    hashed_message,
    signature
  );

  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode);
  let key;
  key = createTransferKey(
    prover_address,
    countryparty_address,
    token_address,
    signature
  );

  const proverPartyAddressBytes = addressToBytes(prover_address);
  const counterPartyAddressBytes = addressToBytes(countryparty_address);
  const tokenAddressBytes = addressToBytes(token_address);

  const array_values = Array.from({ length: 50 }, (_, i) =>
    bigIntToU8Array(BigInt((i + 1) * 0), 32)
  );

  const privateInputs = {
    value: array_values,
    size: values.length,
    leaf_hash: Array.from(getBytes(leaf_hash)),
    pairwise_value_bytes: bigIntToU8Array(pairwise_value, 32),
    pub_key_x: x,
    pub_key_y: y,
    signature: Array.from(getBytes(signature.slice(0, 130))),
    hashed_message: Array.from(getBytes(hashed_message)),
    prover_address: proverPartyAddressBytes,
    countryparty_address: counterPartyAddressBytes, // Note: keeping your typo from circuit
    token_address: tokenAddressBytes,
    key: Array.from(getBytes(key)),
  };

  const { witness, returnValue } = await noir.execute(privateInputs);
  const proof = await backend.generateProof(witness);
  const isValid = await backend.verifyProof(proof);

  const proofJson = {
    proof: proof.proof,
    publicInputs: proof.publicInputs,
    isValid,
    returnValue,
  };
  console.log(proofJson.publicInputs);

  return JSON.stringify(proof);
}

export function verifyProof(proofData: any) {
  const backend = new UltraHonkBackend(circuit.bytecode);
  return backend.verifyProof(proofData);
}

async function test1_BasicProof() {
  try {
    const values = Array.from({ length: 10 }, (_, i) => BigInt(i * 5));

    const wallet = new Wallet(
      "0xa5fe4feee5a0017b0b9591523ff8c683794ce8ca9d3c3c4b661ddfb97e27bf57"
    );
    const message = "Void Wallet Transactions Secret";
    const hashed_message = hashMessage(message);
    const signature = await wallet.signMessage(message);
    const { x, y } = createWalletInformationForTransfer(
      hashed_message,
      signature
    );
    const prover_address = "0x3E001836e2409fa0802b473d0061e338d6E4cf48";
    const counterparty = "0x3E001836e2409fa0802b473d0061e338d6E4cf48";
    const token_address = "0x3E001836e2409fa0802b473d0061e338d6E4cf48";
    const pairwise_value = 400n;

    const key = createTransferKey(
      prover_address,
      counterparty,
      token_address,
      signature
    );
    console.log("key");
    console.log(key);
    console.log(getBytes(key));

    const combinedValues = Uint8Array.from(
      values.map((v) => bigIntToU8Array(v, 32)).flat()
    );

    const combined = concat([getBytes(key), combinedValues, toBeHex(1n, 32)]);

    console.log(getBytes(combined));
    const leaf_hash = keccak256(combined);

    console.log("leaf");
    console.log(leaf_hash);
    console.log(getBytes(leaf_hash));

    const proof = await createLowerProof(
      values,
      leaf_hash,
      pairwise_value,
      signature,
      hashed_message,
      prover_address,
      counterparty,
      token_address
    );

    const vals = deserializePublicInputsFromProof(proof.publicInputs);

    if (proof.isValid) {
      console.log("✓ Test 1 PASSED\n");
    } else {
      console.log("✗ Test 1 FAILED: Proof is invalid\n");
    }
  } catch (error) {
    console.error("✗ Test 1 FAILED:", error);
  }
}

function u8ArrayToBigInt(bytes: number[]): bigint {
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return BigInt("0x" + hex);
}

export function deserializePublicInputsFromProof(
  publicInputs: string[]
): PublicInputs {
  const bytes = publicInputs.map((hex) => parseInt(hex, 16));
  const leaf_hash_bytes = bytes.slice(0, 32);
  const pairwise_value_bytes = bytes.slice(32, 64);
  const prover_address_bytes = bytes.slice(64, 84);
  const countryparty_address_bytes = bytes.slice(84, 104);
  const token_address_bytes = bytes.slice(104, 124);
  const key_bytes = bytes.slice(124, 156);

  return {
    leaf_hash:
      "0x" +
      leaf_hash_bytes.map((b) => b.toString(16).padStart(2, "0")).join(""),
    pairwise_value: u8ArrayToBigInt(pairwise_value_bytes),
    prover_address:
      "0x" +
      prover_address_bytes.map((b) => b.toString(16).padStart(2, "0")).join(""),
    countryparty_address:
      "0x" +
      countryparty_address_bytes
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    token_address:
      "0x" +
      token_address_bytes.map((b) => b.toString(16).padStart(2, "0")).join(""),
    key: "0x" + key_bytes.map((b) => b.toString(16).padStart(2, "0")).join(""),
  };
}
