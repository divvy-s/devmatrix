"use client";

import { useCallback, useEffect, useState } from "react";
import { REWARD_THRESHOLDS } from "@/lib/rewards";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { templeSprintTierRewardsAbi } from "@/lib/abi/templeSprintTierRewards";

interface Character {
  id: string;
  name: string;
  emoji: string;
  tier: "common" | "rare" | "legendary";
  speed: number;
  agility: number;
  luck: number;
  price: number | null; // null = owned
  currency: "SPRINT" | "ETH";
  owned: boolean;
  equipped: boolean;
  unlockScore?: number;
  unlockedByScore?: boolean;
  isNew?: boolean;
}

interface RewardStatusResponse {
  bestScore: number;
}

interface ClaimIntentResponse {
  alreadyClaimed?: boolean;
  walletAddress?: string | null;
  tier?: number;
  week?: string;
  claimId?: `0x${string}`;
  signature?: `0x${string}`;
  contractAddress?: `0x${string}`;
  error?: string;
}

const RAW_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
const TARGET_CHAIN_ID = Number.isFinite(RAW_CHAIN_ID) && RAW_CHAIN_ID > 0 ? RAW_CHAIN_ID : sepolia.id;
const REWARD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const BADGE_CONFIG = [
  { tier: 1, label: "Bronze Badge", unlockScore: REWARD_THRESHOLDS.bronze, color: "#d38f59", emoji: "🥉" },
  { tier: 2, label: "Silver Badge", unlockScore: REWARD_THRESHOLDS.silver, color: "#c7d3df", emoji: "🥈" },
  { tier: 3, label: "Gold Badge", unlockScore: REWARD_THRESHOLDS.gold, color: "#f8d26a", emoji: "🥇" },
] as const;

function getCharacterDelay(id: string): string {
  const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return `${(hash % 20) / 10}s`;
}

const CHARACTERS: Character[] = [
  {
    id: "temple-runner",
    name: "Temple Runner",
    emoji: "🏃",
    tier: "common",
    speed: 60,
    agility: 70,
    luck: 40,
    price: null,
    currency: "SPRINT",
    owned: true,
    equipped: true,
  },
  {
    id: "jungle-explorer",
    name: "Jungle Explorer",
    emoji: "🧭",
    tier: "common",
    speed: 65,
    agility: 60,
    luck: 55,
    price: 250,
    currency: "SPRINT",
    owned: false,
    equipped: false,
    unlockScore: REWARD_THRESHOLDS.bronze,
  },
  {
    id: "shadow-monk",
    name: "Shadow Monk",
    emoji: "🥷",
    tier: "rare",
    speed: 80,
    agility: 90,
    luck: 45,
    price: 1200,
    currency: "SPRINT",
    owned: false,
    equipped: false,
    unlockScore: REWARD_THRESHOLDS.silver,
    isNew: true,
  },
  {
    id: "golden-idol",
    name: "Golden Idol",
    emoji: "🏺",
    tier: "rare",
    speed: 75,
    agility: 65,
    luck: 85,
    price: 800,
    currency: "SPRINT",
    owned: false,
    equipped: false,
    unlockScore: REWARD_THRESHOLDS.silver,
  },
  {
    id: "ancient-guardian",
    name: "Ancient Guardian",
    emoji: "🗿",
    tier: "legendary",
    speed: 95,
    agility: 85,
    luck: 95,
    price: 0.05,
    currency: "ETH",
    owned: false,
    equipped: false,
    unlockScore: REWARD_THRESHOLDS.gold,
  },
  {
    id: "phoenix-spirit",
    name: "Phoenix Spirit",
    emoji: "🔥",
    tier: "legendary",
    speed: 100,
    agility: 95,
    luck: 80,
    price: 0.08,
    currency: "ETH",
    owned: false,
    equipped: false,
    unlockScore: REWARD_THRESHOLDS.gold,
    isNew: true,
  },
];

type FilterType = "all" | "owned" | "rare" | "new";

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            color: "rgba(196,168,130,0.7)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 10,
            color: "#C4A882",
            fontWeight: 700,
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: "#ffffff",
            borderRadius: 2,
            transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: Character["tier"] }) {
  const config = {
    common: { label: "COMMON", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" },
    rare: { label: "RARE", color: "rgba(255,255,255,0.7)", bg: "rgba(255,255,255,0.1)" },
    legendary: { label: "ELITE", color: "#ffffff", bg: "rgba(255,255,255,0.2)" },
  }[tier];

  return (
    <span
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 9,
        fontWeight: 700,
        color: config.color,
        background: config.bg,
        border: `1px solid ${config.color}50`,
        borderRadius: 4,
        padding: "2px 6px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {config.label}
    </span>
  );
}

function CharacterCard({
  character,
  onEquip,
  onBuy,
}: {
  character: Character;
  onEquip: (id: string) => void;
  onBuy: (id: string) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const isLocked = !character.owned;

  return (
    <div
      className="float-anim relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: "rgba(0,0,0,0.9)",
        border: `1px solid rgba(255,255,255,${character.tier === "legendary" ? "0.2" : "0.05"})`,
        animationDelay: getCharacterDelay(character.id),
        perspective: 600,
        minHeight: 280,
      }}
      onClick={() => setFlipped((f) => !f)}
    >
      {/* New badge */}
      {character.isNew && (
        <div
          className="absolute top-2 right-2 z-20"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 7,
            fontWeight: 800,
            color: "#ffffff",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 4,
            padding: "2px 6px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          NEW
        </div>
      )}

      {/* Card face (front) */}
      <div
        style={{
          display: flipped ? "none" : "flex",
          flexDirection: "column",
          padding: "20px 16px 16px",
          height: "100%",
          gap: 12,
          animation: flipped ? undefined : "cardFlipIn 0.35s ease-out",
        }}
      >
        {/* Avatar */}
        <div className="flex flex-col items-center mb-1">
          <div
            style={{
              fontSize: 52,
              lineHeight: 1,
              marginBottom: 10,
              filter: isLocked
                ? "grayscale(0.7) brightness(0.6)"
                : "drop-shadow(0 0 12px rgba(217,119,6,0.6))",
            }}
          >
            {character.emoji}
          </div>
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 14,
              fontWeight: 700,
              color: "#FEF3C7",
              letterSpacing: "0.05em",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {character.name}
          </div>
          <TierBadge tier={character.tier} />
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2">
          <StatBar label="Speed" value={character.speed} />
          <StatBar label="Agility" value={character.agility} />
          <StatBar label="Luck" value={character.luck} />
        </div>

        {/* Action button */}
        <div className="mt-auto">
          {character.equipped ? (
            <div
              className="glow-green"
              style={{
                textAlign: "center",
                padding: "8px",
                borderRadius: 10,
                border: "1px solid rgba(22,163,74,0.5)",
                background: "rgba(22,101,52,0.2)",
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                fontWeight: 700,
                color: "#22C55E",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              ✓ Equipped
            </div>
          ) : character.owned ? (
            <button
              className="glow-green w-full"
              onClick={(e) => {
                e.stopPropagation();
                onEquip(character.id);
              }}
              style={{
                padding: "8px",
                borderRadius: 10,
                border: "1px solid rgba(22,163,74,0.5)",
                background: "rgba(22,101,52,0.2)",
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                fontWeight: 700,
                color: "#22C55E",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Equip
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBuy(character.id);
              }}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {character.unlockScore
                ? `UNLOCK @ ${character.unlockScore.toLocaleString()} SCORE`
                : `PRICE: ${character.currency === "ETH"
                    ? `${character.price} ETH`
                    : `${character.price} PTS`}`}
            </button>
          )}
        </div>
      </div>

      {/* Card back (detail) */}
      {flipped && (
        <div
          style={{
            padding: "20px 16px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            animation: "cardFlipIn 0.35s ease-out",
          }}
        >
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 20,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {character.emoji}
          </div>
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 13,
              fontWeight: 700,
              color: "#FEF3C7",
              textAlign: "center",
            }}
          >
            {character.name}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: "#C4A882",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {character.tier === "legendary"
              ? "A mythical being wielding ancient temple powers. Unstoppable."
              : character.tier === "rare"
              ? "Battle-tested and swift. Chosen by the temple spirits."
              : "A brave soul who dared to enter the sacred halls."}
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: 10,
              borderRadius: 10,
              background: "rgba(217,119,6,0.05)",
              border: "1px solid rgba(217,119,6,0.2)",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "#7A6647", marginBottom: 4 }}
            >
              TAP TO FLIP BACK
            </div>
            <TierBadge tier={character.tier} />
          </div>
        </div>
      )}

      {/* Shimmer lock overlay */}
      {isLocked && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(13,10,5,0.55)", zIndex: 10 }}
        >
          <div className="shimmer absolute inset-0" style={{ zIndex: 9 }} />
          <div
            style={{
              fontSize: 28,
              filter: "drop-shadow(0 0 8px rgba(217,119,6,0.5))",
              zIndex: 11,
              position: "relative",
            }}
          >
            🔒
          </div>
        </div>
      )}
    </div>
  );
}

interface CharacterShopProps {
  onClose: () => void;
  currentFid?: number;
  sprintBalance?: number;
  ethBalance?: string;
}

export default function CharacterShop({
  onClose,
  currentFid,
  sprintBalance = 1250,
  ethBalance = "0.12",
}: CharacterShopProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [characters, setCharacters] = useState(CHARACTERS);
  const [weeklyBestScore, setWeeklyBestScore] = useState(0);
  const [vaultBalance, setVaultBalance] = useState(sprintBalance);
  const [walletError, setWalletError] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claimNotice, setClaimNotice] = useState("");
  const [claimingTier, setClaimingTier] = useState<1 | 2 | 3 | null>(null);
  const [intentClaimTier, setIntentClaimTier] = useState<1 | 2 | 3 | 0>(0);
  const [intentClaimWeek, setIntentClaimWeek] = useState("");
  const [intentClaimId, setIntentClaimId] = useState<`0x${string}` | null>(null);
  const [syncedHash, setSyncedHash] = useState<`0x${string}` | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const {
    writeContractAsync,
    data: txHash,
    isPending: isClaimSubmitting,
    error: writeContractError,
  } = useWriteContract();

  const claimHash = txHash as `0x${string}` | undefined;
  const {
    isLoading: isClaimMining,
    isSuccess: isClaimMined,
    isError: isClaimFailed,
    error: claimMiningError,
  } = useWaitForTransactionReceipt({ hash: claimHash });

  const rewardContract = REWARD_CONTRACT_ADDRESS;
  const onCorrectNetwork = chainId === TARGET_CHAIN_ID;
  const canQueryBadges = Boolean(isConnected && address && rewardContract && onCorrectNetwork);

  const { data: bronzeBalance, refetch: refetchBronzeBalance } = useReadContract({
    abi: templeSprintTierRewardsAbi,
    address: rewardContract ?? ZERO_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address, 1] : undefined,
    query: { enabled: canQueryBadges },
  });

  const { data: silverBalance, refetch: refetchSilverBalance } = useReadContract({
    abi: templeSprintTierRewardsAbi,
    address: rewardContract ?? ZERO_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address, 2] : undefined,
    query: { enabled: canQueryBadges },
  });

  const { data: goldBalance, refetch: refetchGoldBalance } = useReadContract({
    abi: templeSprintTierRewardsAbi,
    address: rewardContract ?? ZERO_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address, 3] : undefined,
    query: { enabled: canQueryBadges },
  });

  const badgeBalances = {
    1: typeof bronzeBalance === "bigint" ? bronzeBalance : 0n,
    2: typeof silverBalance === "bigint" ? silverBalance : 0n,
    3: typeof goldBalance === "bigint" ? goldBalance : 0n,
  } as const;

  useEffect(() => {
    if (!connectError) return;
    setWalletError(connectError.message || "Wallet connection failed");
  }, [connectError]);

  useEffect(() => {
    if (!writeContractError) return;
    setClaimError(writeContractError.message || "Wallet rejected or transaction failed");
    setClaimingTier(null);
  }, [writeContractError]);

  useEffect(() => {
    if (!isClaimFailed || !claimMiningError) return;
    setClaimError(claimMiningError.message || "Transaction failed on-chain");
    setClaimingTier(null);
  }, [isClaimFailed, claimMiningError]);

  const connectWallet = useCallback(async () => {
    setWalletError("");

    const preferredConnector =
      connectors.find((connector) => connector.id.toLowerCase().includes("metamask")) ??
      connectors.find((connector) => connector.name.toLowerCase().includes("metamask"));

    const orderedConnectors = preferredConnector
      ? [preferredConnector, ...connectors.filter((connector) => connector !== preferredConnector)]
      : [...connectors];

    let lastError: unknown;
    for (const connector of orderedConnectors) {
      try {
        await connectAsync({ connector });
        return;
      } catch (error) {
        lastError = error;
      }
    }

    const ethereum = (window as Window & {
      ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    }).ethereum;

    if (ethereum) {
      try {
        await ethereum.request({ method: "eth_requestAccounts" });
        const injectedConnector = connectors.find((connector) => connector.id.toLowerCase().includes("injected"));
        if (injectedConnector) {
          await connectAsync({ connector: injectedConnector });
          return;
        }
      } catch (error) {
        lastError = error;
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : "MetaMask connection failed. Open MetaMask and try again.";
    setWalletError(message);
  }, [connectAsync, connectors]);

  const switchToTargetChain = async () => {
    if (onCorrectNetwork) return;
    try {
      setWalletError("");
      await switchChainAsync({ chainId: TARGET_CHAIN_ID });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to switch chain";
      setWalletError(message);
    }
  };

  const syncVaultProgress = useCallback(async () => {
    if (!currentFid || currentFid <= 0) return;

    let cancelled = false;
    try {
      const response = await fetch(`/api/reward/status?fid=${currentFid}`);
      if (!response.ok) return;

      const data = (await response.json()) as RewardStatusResponse;
      const best = Number(data.bestScore ?? 0);
      if (cancelled) return;

      setWeeklyBestScore(best);
      setVaultBalance(Math.max(sprintBalance, best));

      setCharacters((prev) =>
        prev.map((character) => {
          const unlockedByScore =
            typeof character.unlockScore === "number" && best >= character.unlockScore;

          if (!unlockedByScore) return character;

          return {
            ...character,
            owned: true,
            unlockedByScore: true,
            price: null,
          };
        })
      );
    } catch {
      // Keep vault usable even if reward status is temporarily unavailable.
    }

    return () => {
      cancelled = true;
    };
  }, [currentFid, sprintBalance]);

  useEffect(() => {
    if (!currentFid || currentFid <= 0) return;

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/reward/status?fid=${currentFid}`);
        if (!response.ok) return;

        const data = (await response.json()) as RewardStatusResponse;
        const best = Number(data.bestScore ?? 0);
        if (cancelled) return;

        setWeeklyBestScore(best);
        setVaultBalance(Math.max(sprintBalance, best));

        setCharacters((prev) =>
          prev.map((character) => {
            const unlockedByScore =
              typeof character.unlockScore === "number" && best >= character.unlockScore;

            if (!unlockedByScore) return character;

            return {
              ...character,
              owned: true,
              unlockedByScore: true,
              price: null,
            };
          })
        );
      } catch {
        // Keep vault usable even if reward status is temporarily unavailable.
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentFid, sprintBalance]);

  useEffect(() => {
    if (!isClaimMined || !claimHash || !address || !intentClaimId || !currentFid || syncedHash === claimHash) return;

    const syncClaim = async () => {
      try {
        const response = await fetch("/api/reward/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: currentFid,
            wallet_address: address,
            week: intentClaimWeek,
            tier: intentClaimTier,
            tx_hash: claimHash,
            claim_id: intentClaimId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to sync claim status");
        }

        setSyncedHash(claimHash);
        setClaimingTier(null);
        setClaimError("");
        setClaimNotice("Badge claimed successfully");

        await Promise.all([
          syncVaultProgress(),
          refetchBronzeBalance(),
          refetchSilverBalance(),
          refetchGoldBalance(),
        ]);
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : "Failed to sync claim");
      }
    };

    void syncClaim();
  }, [
    isClaimMined,
    claimHash,
    address,
    intentClaimId,
    currentFid,
    syncedHash,
    intentClaimWeek,
    intentClaimTier,
    syncVaultProgress,
    refetchBronzeBalance,
    refetchSilverBalance,
    refetchGoldBalance,
  ]);

  const claimBadge = useCallback(
    async (requestedTier: 1 | 2 | 3) => {
      setClaimError("");
      setClaimNotice("");
      setClaimingTier(requestedTier);

      if (!currentFid || currentFid <= 0) {
        setClaimError("Missing Farcaster identity. Open app from Farcaster or local fc_mock mode.");
        setClaimingTier(null);
        return;
      }

      if (!rewardContract) {
        setClaimError("Reward contract address is not configured");
        setClaimingTier(null);
        return;
      }

      if (!isConnected || !address) {
        await connectWallet();
        setClaimingTier(null);
        return;
      }

      try {
        if (chainId !== TARGET_CHAIN_ID) {
          await switchChainAsync({ chainId: TARGET_CHAIN_ID });
        }

        const intentRes = await fetch("/api/reward/claim-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid: currentFid, wallet_address: address, requested_tier: requestedTier }),
        });

        const intentData = (await intentRes.json().catch(() => ({}))) as ClaimIntentResponse;
        if (!intentRes.ok) {
          throw new Error(intentData?.error || "Reward eligibility check failed");
        }

        if (intentData?.alreadyClaimed) {
          setClaimNotice("This week reward is already claimed");
          setClaimingTier(null);
          await Promise.all([
            syncVaultProgress(),
            refetchBronzeBalance(),
            refetchSilverBalance(),
            refetchGoldBalance(),
          ]);
          return;
        }

        const tier = Number(intentData?.tier ?? 0) as 0 | 1 | 2 | 3;
        if (tier <= 0) {
          throw new Error("Current weekly score is not eligible for reward");
        }

        const week = String(intentData?.week ?? "");
        const claimId = intentData?.claimId;
        const signature = intentData?.signature;
        const contractAddress = (intentData?.contractAddress || rewardContract) as `0x${string}`;

        if (!week || !claimId || !signature || !contractAddress) {
          throw new Error("Invalid reward claim payload");
        }

        setIntentClaimTier(tier);
        setIntentClaimWeek(week);
        setIntentClaimId(claimId);
        setClaimNotice(`Submitting ${tier === 3 ? "Gold" : tier === 2 ? "Silver" : "Bronze"} badge claim...`);

        await writeContractAsync({
          abi: templeSprintTierRewardsAbi,
          address: contractAddress,
          functionName: "claimReward",
          args: [tier, week, claimId, signature],
          chainId: TARGET_CHAIN_ID,
        });
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : "Transaction failed");
        setClaimingTier(null);
      }
    },
    [
      currentFid,
      rewardContract,
      isConnected,
      address,
      chainId,
      switchChainAsync,
      connectWallet,
      syncVaultProgress,
      refetchBronzeBalance,
      refetchSilverBalance,
      refetchGoldBalance,
      writeContractAsync,
    ]
  );

  const filtered = characters.filter((c) => {
    if (filter === "owned") return c.owned;
    if (filter === "rare") return c.tier === "rare" || c.tier === "legendary";
    if (filter === "new") return c.isNew;
    return true;
  });

  const handleEquip = (id: string) => {
    setCharacters((prev) =>
      prev.map((c) => ({ ...c, equipped: c.id === id }))
    );
  };

  const handleBuy = (id: string) => {
    const char = characters.find((c) => c.id === id);
    if (!char) return;

    if (typeof char.unlockScore === "number" && weeklyBestScore < char.unlockScore) {
      return;
    }

    // Simulate purchase
    if (char.currency === "SPRINT" && char.price && vaultBalance >= char.price) {
      setCharacters((prev) =>
        prev.map((c) => (c.id === id ? { ...c, owned: true } : c))
      );
    }
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "owned", label: "Owned" },
    { key: "rare", label: "Rare" },
    { key: "new", label: "New" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(13,10,5,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden crack-reveal"
        style={{
          background: "linear-gradient(145deg, #1A1208, #0D0A05)",
          border: "1px solid rgba(217,119,6,0.3)",
          boxShadow: "0 0 60px rgba(217,119,6,0.15), 0 40px 80px rgba(0,0,0,0.6)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            position: "sticky",
            top: 0,
            background: "#000000",
            zIndex: 5,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#FEF3C7",
                  margin: 0,
                  letterSpacing: "0.06em",
                }}
              >
                🏺 Character Vault
              </h2>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: "#7A6647",
                  margin: "2px 0 0",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Choose your temple guardian
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#C4A882",
                  margin: "6px 0 0",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Weekly Best: {weeklyBestScore.toLocaleString()} • Unlocks @ {REWARD_THRESHOLDS.bronze.toLocaleString()} / {REWARD_THRESHOLDS.silver.toLocaleString()} / {REWARD_THRESHOLDS.gold.toLocaleString()}
              </p>
            </div>

            {/* Balance display */}
            <div className="flex items-center gap-3">
              <div className="hud-panel px-3 py-2 text-center">
                <div style={{ fontSize: 9, color: "rgba(217,119,6,0.7)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "'Inter', sans-serif" }}>
                  $SPRINT
                </div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 800, color: "#F59E0B" }}>
                  {vaultBalance.toLocaleString()}
                </div>
              </div>
              <div className="hud-panel px-3 py-2 text-center">
                <div style={{ fontSize: 9, color: "rgba(217,119,6,0.7)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "'Inter', sans-serif" }}>
                  ETH
                </div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 800, color: "#C4A882" }}>
                  {ethBalance}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: filter === f.key
                    ? "1px solid rgba(255,255,255,0.2)"
                    : "1px solid rgba(255,255,255,0.05)",
                  background: filter === f.key
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                  color: filter === f.key ? "#ffffff" : "rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "12px",
              borderRadius: 12,
              border: "1px solid rgba(217,119,6,0.2)",
              background: "rgba(13,10,5,0.65)",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: "#FEF3C7",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                marginBottom: 8,
              }}
            >
              NFT Badges
            </div>

            {!rewardContract && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#F59E0B",
                  marginBottom: 8,
                }}
              >
                Configure NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS to load on-chain badges.
              </div>
            )}

            {!isConnected && (
              <button
                onClick={() => {
                  void connectWallet();
                }}
                disabled={isConnecting}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(217,119,6,0.4)",
                  background: "rgba(217,119,6,0.12)",
                  color: "#F59E0B",
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {isConnecting ? "Connecting Wallet..." : "Connect MetaMask"}
              </button>
            )}

            {isConnected && address && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#C4A882",
                  marginBottom: 8,
                }}
              >
                Connected: {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </div>
            )}

            {walletError && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#FCA5A5",
                  marginBottom: 8,
                }}
              >
                {walletError}
              </div>
            )}

            {claimError && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#FCA5A5",
                  marginBottom: 8,
                }}
              >
                {claimError}
              </div>
            )}

            {claimNotice && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#86EFAC",
                  marginBottom: 8,
                }}
              >
                {claimNotice}
              </div>
            )}

            {isConnected && !onCorrectNetwork && (
              <button
                onClick={switchToTargetChain}
                disabled={isSwitchingChain}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(194,65,12,0.45)",
                  background: "rgba(194,65,12,0.12)",
                  color: "#F97316",
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {isSwitchingChain ? "Switching..." : "Switch To Sepolia"}
              </button>
            )}

            {isConnected && onCorrectNetwork && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                {BADGE_CONFIG.map((badge) => {
                  const balance = badgeBalances[badge.tier as 1 | 2 | 3];
                  const owned = balance > 0n;
                  const scoreUnlocked = weeklyBestScore >= badge.unlockScore;
                  const statusText = owned
                    ? `Owned (${balance.toString()})`
                    : scoreUnlocked
                      ? "Eligible now - claim to mint"
                      : `Unlock @ ${badge.unlockScore.toLocaleString()}`;
                  const isClaimingThis = claimingTier === badge.tier;
                  const canClaim =
                    isConnected &&
                    onCorrectNetwork &&
                    Boolean(currentFid && currentFid > 0) &&
                    scoreUnlocked &&
                    !owned &&
                    !isClaimSubmitting &&
                    !isClaimMining;
                  return (
                    <div
                      key={badge.tier}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${owned ? `${badge.color}80` : "rgba(255,255,255,0.08)"}`,
                        background: owned ? "rgba(22,101,52,0.18)" : "rgba(255,255,255,0.03)",
                        padding: "8px 10px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 10,
                          color: owned ? badge.color : "rgba(255,255,255,0.35)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 3,
                        }}
                      >
                        <span>{badge.emoji}</span>
                        <span>{badge.label}</span>
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 9,
                          color: owned ? "#86EFAC" : scoreUnlocked ? "#FCD34D" : "#C4A882",
                        }}
                      >
                        {statusText}
                      </div>

                      {scoreUnlocked && !owned && (
                        <button
                          onClick={() => {
                            void claimBadge(badge.tier as 1 | 2 | 3);
                          }}
                          disabled={!canClaim}
                          style={{
                            marginTop: 6,
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid rgba(217,119,6,0.35)",
                            background: canClaim ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.05)",
                            color: canClaim ? "#F59E0B" : "rgba(255,255,255,0.35)",
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            padding: "6px 8px",
                            cursor: canClaim ? "pointer" : "not-allowed",
                          }}
                        >
                          {isClaimingThis || isClaimSubmitting || isClaimMining ? "Claiming..." : "Claim Badge"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isConnected && onCorrectNetwork && (
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 9,
                  color: "#A78B63",
                  marginTop: 8,
                }}
              >
                Claim buttons above mint eligible badges directly to your connected wallet.
              </div>
            )}
          </div>
        </div>

        {/* Character grid */}
        <div
          style={{
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((char, i) => (
            <div
              key={char.id}
              style={{
                animation: `slideInRow 0.4s ease-out ${i * 0.07}s both`,
              }}
            >
              <CharacterCard
                character={char}
                onEquip={handleEquip}
                onBuy={handleBuy}
              />
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "40px",
                textAlign: "center",
                fontFamily: "'Cinzel', serif",
                color: "#7A6647",
                fontSize: 13,
              }}
            >
              No characters match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
