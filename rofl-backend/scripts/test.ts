import { ethers, SigningKey } from "ethers";

const signature = "0x44ec1aab2a1ad4782af2428808ea2727cb89ee85d1659945242af9d42b05c8d74a1d96102aa78ca415de3445d6dc4d1ad6c3adf0341364c341cb8516f3f878821b";
const message = "Void Wallet Balances Secret";

const messageHash = ethers.hashMessage(message);   // EIP-191 hash
const publicKey = SigningKey.recoverPublicKey(messageHash, signature);

console.log("Public key:", publicKey);