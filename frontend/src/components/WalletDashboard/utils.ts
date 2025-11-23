import { formatUnits } from "viem";

export function formatTokenBalance(value: bigint, decimals: number) {
    if (value === 0n) {
        return "0";
    }

    const numericValue = Number.parseFloat(formatUnits(value, decimals));

    if (!Number.isFinite(numericValue)) {
        return "0";
    }

    const fractionDigits = numericValue >= 1 ? 4 : 6;
    return numericValue.toLocaleString("en-US", {
        maximumFractionDigits: fractionDigits,
    });
}
