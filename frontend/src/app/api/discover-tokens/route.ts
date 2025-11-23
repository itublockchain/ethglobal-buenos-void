import { NextRequest, NextResponse } from "next/server";
import { type Address } from "viem";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "walletAddress parameter is required" },
      { status: 400 }
    );
  }

  const alchemyApiKey = process.env.ALCHEMY_API_KEY;

  if (!alchemyApiKey) {
    return NextResponse.json({
      tokens: [
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC
        "0x808456652fdb597867f38412077A9182bf77359F", // EURC
      ] as Address[],
    });
  }

  try {
    const alchemyUrl = `https://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

    const response = await fetch(alchemyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [walletAddress, "erc20"],
        id: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch token balances: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    // Filter tokens with non-zero balance
    interface TokenBalance {
      tokenBalance?: string;
      contractAddress: string;
    }
    const tokens =
      data.result?.tokenBalances
        ?.filter((token: TokenBalance) => {
          const balance = BigInt(token.tokenBalance || "0");
          return balance > 0n;
        })
        .map((token: TokenBalance) => token.contractAddress as Address) || [];

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("[Alchemy] Error:", error);

    // Return fallback tokens on error
    return NextResponse.json({
      tokens: [
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC
        "0x808456652fdb597867f38412077A9182bf77359F", // EURC
      ] as Address[],
    });
  }
}
