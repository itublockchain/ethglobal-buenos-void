import { NextRequest, NextResponse } from "next/server";
import { fetchMultipleTokenMetadata } from "@/lib/token-metadata";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tokens = body.tokens as Array<{ address: string; symbol?: string }>;

    if (!tokens || !Array.isArray(tokens)) {
      return NextResponse.json(
        { error: "tokens array is required" },
        { status: 400 }
      );
    }

    const metadata = await fetchMultipleTokenMetadata(tokens);

    // Extract prices from metadata
    const prices: Record<string, number> = {};
    metadata.forEach((meta, tokenAddress) => {
      if (meta.price) {
        prices[tokenAddress.toLowerCase()] = meta.price;
      }
    });

    return NextResponse.json({ prices });
  } catch (error) {
    console.error("Failed to fetch token prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch token prices" },
      { status: 500 }
    );
  }
}
