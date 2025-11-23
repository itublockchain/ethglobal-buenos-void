import { type Address } from "viem";
import { SupportedToken } from "./types";

// Known token addresses on Base Sepolia
// Metadata (symbol, name, decimals, logo) will be fetched from Alchemy API
export const SUPPORTED_TOKENS: SupportedToken[] = [
    {
        id: "eth",
        symbol: "ETH", // Fallback if API fails
        name: "Ether", // Fallback if API fails
        type: "native",
        decimals: 18,
        description: "Native token on Base Sepolia",
    },
    {
        id: "usdc",
        symbol: "USDC", // Will be overridden by API data
        name: "USD Coin",
        type: "erc20",
        decimals: 6,
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        description: "Token on Base Sepolia",
    },
    {
        id: "eurc",
        symbol: "EURC", // Will be overridden by API data
        name: "Euro Coin",
        type: "erc20",
        decimals: 6,
        address: "0x808456652fdb597867f38412077A9182bf77359F",
        description: "Token on Base Sepolia",
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
