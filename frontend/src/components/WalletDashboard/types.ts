import { type Address } from "viem";

export type SupportedToken = {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
    type: "native" | "erc20";
    address?: Address;
    description: string;
};

export type TokenWithBalance = SupportedToken & {
    balanceRaw: bigint;
    formattedBalance: string;
    isBalanceLoading: boolean;
};

export interface Asset {
    symbol: string;
    name: string;
    amount: number;
    value: number;
    address?: string;
    logo?: string;
}

export interface Wallet {
    id: string;
    name: string;
    address: string;
    totalUsd: number;
    assets: Asset[];
}

export interface WalletDashboardProps {
    wallet: Wallet;
    onTokensUpdate?: (tokens: Asset[]) => void;
}
