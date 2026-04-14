import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const tokenId = resolvedParams.id;
  
  // Base App URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://temple-sprint.vercel.app";

  return NextResponse.json({
    name: `Temple Sprint Champion #${tokenId}`,
    description: "An exclusive on-chain badge earned by dominating the weekly leaderboard in Temple Sprint on Farcaster.",
    image: `${appUrl}/og.png`, // We'll just use the game's splash screen/OG image for the NFT for MVP
    attributes: [
      {
        trait_type: "Game",
        value: "Temple Sprint"
      },
      {
        trait_type: "Network",
        value: "Sepolia Testnet"
      }
    ]
  });
}
