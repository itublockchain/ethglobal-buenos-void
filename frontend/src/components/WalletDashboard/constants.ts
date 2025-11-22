import { type Address } from "viem";
import { SupportedToken } from "./types";

export const SUPPORTED_TOKENS: SupportedToken[] = [
    {
        id: "eth",
        symbol: "ETH",
        name: "Ether",
        type: "native",
        decimals: 18,
        description: "Native token on Base Sepolia",
    },
    {
        id: "usdc",
        symbol: "USDC",
        name: "USD Coin",
        type: "erc20",
        decimals: 6,
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        description: "Circle USD Coin on Base Sepolia",
    },
];

// Void Contract Address on Base Sepolia
export const VOID_CONTRACT_ADDRESS =
    "0x017669FB1b0d1A4ec1BaA8a9D6c62fdbf3E3c58a" as Address;

// Void Contract ABI - sadece ihtiyacımız olan fonksiyonlar
export const VOID_CONTRACT_ABI = [
    {
        inputs: [
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "address", name: "tokenAddress", type: "address" },
        ],
        name: "deposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "address", name: "tokenAddress", type: "address" },
        ],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;
