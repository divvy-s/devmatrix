"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FarcasterContext } from "@/types/game";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { getWeekKey } from "@/lib/week";
import {
  RewardTier,
  REWARD_THRESHOLDS,
  getRewardTier,
  getRewardTierColor,
  getRewardTierLabel,
} from "@/lib/rewards";
import { templeSprintTierRewardsAbi } from "@/lib/abi/templeSprintTierRewards";

const RAW_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
const TARGET_CHAIN_ID = Number.isFinite(RAW_CHAIN_ID) && RAW_CHAIN_ID > 0 ? RAW_CHAIN_ID : sepolia.id;
const REWARD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined;

interface ScoreScreenProps {
  score: number;
  context: FarcasterContext;
  onRestart: () => void;
  onShare: () => void;
  onBackToHome: () => void;
  isSaving: boolean;
}

interface RewardStatusResponse {
  week: string;
  bestScore: number;
  tier: RewardTier;
  alreadyClaimed: boolean;
  walletAddress: string | null;
}

interface ClaimIntentResponse {
  alreadyClaimed?: boolean;
  walletAddress?: string | null;
  tier?: RewardTier;
  week?: string;
  claimId?: `0x${string}`;
  signature?: `0x${string}`;
  contractAddress?: `0x${string}`;
  error?: string;
}

const STAR_BURST_POSITIONS = [
  { left: 42, top: 32 },
  { left: 55, top: 30 },
  { left: 38, top: 38 },
  { left: 58, top: 38 },
  { left: 46, top: 28 },
  { left: 52, top: 42 },
  { left: 35, top: 34 },
  { left: 61, top: 34 },
  { left: 48, top: 36 },
  { left: 50, top: 26 },
];

// === Floating ember particle ===
function Ember({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="ember"
      style={style}
    />
  );
}

// === Star burst particle for new high score ===
function StarBurst() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {STAR_BURST_POSITIONS.map((position, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${position.left}%`,
            top: `${position.top}%`,
            fontSize: 14,
            animation: `starBurst 0.8s ease-out ${i * 0.08}s both`,
            transformOrigin: "center",
          }}
        >
          ⭐
        </div>
      ))}
    </div>
  );
}

export default function ScoreScreen({
  score,
  context,
  onRestart,
  onShare,
  onBackToHome,
  isSaving,
}: ScoreScreenProps) {
  const [shared, setShared] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isCheckingClaimStatus, setIsCheckingClaimStatus] = useState(false);
  const [isSyncingClaimStatus, setIsSyncingClaimStatus] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [walletOnRecord, setWalletOnRecord] = useState<string | null>(null);
  const [syncedHash, setSyncedHash] = useState<`0x${string}` | null>(null);

  const [eligibleTier, setEligibleTier] = useState<RewardTier>(0);
  const [eligibleWeek, setEligibleWeek] = useState("");
  const [bestScoreForWeek, setBestScoreForWeek] = useState(0);

  const [intentClaimTier, setIntentClaimTier] = useState<RewardTier>(0);
  const [intentClaimWeek, setIntentClaimWeek] = useState("");
  const [intentClaimId, setIntentClaimId] = useState<`0x${string}` | null>(null);

  // Score count-up state
  const [displayScore, setDisplayScore] = useState(0);
  const [isNewHighScore] = useState(score > 1000); // Simulate high score check
  const [visible, setVisible] = useState(false);

  const weekKey = useMemo(() => getWeekKey(new Date()), []);
  const scoreTier = getRewardTier(score);

  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
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

  // Trigger visible after a brief delay (for crack-reveal)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Score count-up animation
  useEffect(() => {
    if (!visible) return;
    let current = 0;
    const target = score;
    const duration = 1200; // ms
    const steps = 40;
    const stepTime = duration / steps;
    const increment = target / steps;

    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [visible, score]);

  const handleShare = () => {
    setShared(true);
    onShare();
  };

  const fetchRewardStatus = useCallback(async () => {
    if (!context.fid || context.fid <= 0) return;

    setIsCheckingClaimStatus(true);
    try {
      const response = await fetch(`/api/reward/status?fid=${context.fid}`);
      if (!response.ok) return;
      const data = (await response.json()) as RewardStatusResponse;

      setRewardClaimed(Boolean(data.alreadyClaimed));
      setWalletOnRecord(data.walletAddress ?? null);
      setBestScoreForWeek(Number(data.bestScore ?? 0));
      setEligibleTier(Number(data.tier ?? 0) as RewardTier);
      setEligibleWeek(typeof data.week === "string" ? data.week : weekKey);
    } catch {
      // Non-blocking for gameplay flow.
    } finally {
      setIsCheckingClaimStatus(false);
    }
  }, [context.fid, weekKey]);

  useEffect(() => {
    fetchRewardStatus();
  }, [fetchRewardStatus]);

  useEffect(() => {
    if (!isClaimMined || !claimHash || !address || !intentClaimId || syncedHash === claimHash || !context.fid) return;

    const syncClaim = async () => {
      setIsSyncingClaimStatus(true);
      setClaimError("");
      try {
        const response = await fetch("/api/reward/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: context.fid,
            wallet_address: address,
            week: intentClaimWeek || eligibleWeek || weekKey,
            tier: intentClaimTier || eligibleTier || scoreTier,
            tx_hash: claimHash,
            claim_id: intentClaimId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || "Failed to sync claim status");
        }

        setRewardClaimed(true);
        setWalletOnRecord(address);
        setSyncedHash(claimHash);
        await fetchRewardStatus();
      } catch (err) {
        setClaimError(err instanceof Error ? err.message : "Failed to sync claim status");
      } finally {
        setIsSyncingClaimStatus(false);
      }
    };

    syncClaim();
  }, [
    isClaimMined,
    claimHash,
    address,
    context.fid,
    weekKey,
    syncedHash,
    intentClaimId,
    intentClaimWeek,
    eligibleWeek,
    intentClaimTier,
    eligibleTier,
    scoreTier,
    fetchRewardStatus,
  ]);

  useEffect(() => {
    if (!writeContractError) return;
    setClaimError(writeContractError.message || "Wallet rejected or transaction failed");
  }, [writeContractError]);

  useEffect(() => {
    if (!isClaimFailed || !claimMiningError) return;
    setClaimError(claimMiningError.message || "Transaction failed on-chain");
  }, [isClaimFailed, claimMiningError]);

  const connectWallet = useCallback(() => {
    const preferredConnector =
      connectors.find((connector) => connector.id.toLowerCase().includes("metamask")) ??
      connectors.find((connector) => connector.name.toLowerCase().includes("metamask")) ??
      connectors[0];
    if (!preferredConnector) {
      setClaimError("No wallet connector available");
      return;
    }
    setClaimError("");
    connect({ connector: preferredConnector });
  }, [connect, connectors]);

  const claimReward = useCallback(async () => {
    setClaimError("");

    if (!REWARD_CONTRACT_ADDRESS) {
      setClaimError("Reward contract address is not configured");
      return;
    }

    if (!isConnected) {
      connectWallet();
      return;
    }

    if (!address) {
      setClaimError("Wallet address is unavailable");
      return;
    }

    try {
      if (chainId !== TARGET_CHAIN_ID) {
        await switchChainAsync({ chainId: TARGET_CHAIN_ID });
      }

      const intentRes = await fetch("/api/reward/claim-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: context.fid, wallet_address: address }),
      });

      const intentData = (await intentRes.json().catch(() => ({}))) as ClaimIntentResponse;
      if (!intentRes.ok) {
        throw new Error(intentData?.error || "Reward eligibility check failed");
      }

      if (intentData?.alreadyClaimed) {
        setRewardClaimed(true);
        setWalletOnRecord(intentData.walletAddress ?? walletOnRecord ?? address ?? null);
        await fetchRewardStatus();
        return;
      }

      const tier = Number(intentData?.tier ?? 0) as RewardTier;
      if (tier <= 0) {
        throw new Error("Current weekly score is not eligible for reward");
      }

      const week = String(intentData?.week ?? weekKey);
      const claimId = intentData?.claimId as `0x${string}`;
      const signature = intentData?.signature as `0x${string}`;
      const contractAddress = (intentData?.contractAddress || REWARD_CONTRACT_ADDRESS) as `0x${string}`;

      if (!claimId || !signature || !contractAddress) {
        throw new Error("Invalid reward claim payload");
      }

      setIntentClaimTier(tier);
      setIntentClaimWeek(week);
      setIntentClaimId(claimId);

      await writeContractAsync({
        abi: templeSprintTierRewardsAbi,
        address: contractAddress,
        functionName: "claimReward",
        args: [tier, week, claimId, signature],
        chainId: TARGET_CHAIN_ID,
      });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Transaction failed");
    }
  }, [
    isConnected,
    connectWallet,
    address,
    chainId,
    switchChainAsync,
    context.fid,
    weekKey,
    writeContractAsync,
    walletOnRecord,
    fetchRewardStatus,
  ]);

  const getGrade = (s: number) => {
    if (s >= REWARD_THRESHOLDS.gold) return { label: "GOLD", color: "#f8d26a", emoji: "👑" };
    if (s >= REWARD_THRESHOLDS.silver) return { label: "SILVER", color: "#c7d3df", emoji: "🏆" };
    if (s >= REWARD_THRESHOLDS.bronze) return { label: "BRONZE", color: "#d38f59", emoji: "⚔️" };
    if (s >= 200) return { label: "SURVIVOR", color: "#52525b", emoji: "🛡️" };
    return { label: "FALLEN", color: "#3f3f46", emoji: "💀" };
  };

  const grade = getGrade(score);
  const onCorrectNetwork = chainId === TARGET_CHAIN_ID;
  const isClaimBusy =
    isSaving ||
    isConnecting ||
    isSwitchingChain ||
    isClaimSubmitting ||
    isClaimMining ||
    isSyncingClaimStatus;

  const rewardScore = Math.max(score, bestScoreForWeek);
  const computedTier = getRewardTier(rewardScore);
  const targetTier = (Math.max(eligibleTier, computedTier) as RewardTier);
  const targetTierLabel = getRewardTierLabel(targetTier);
  const targetTierColor = getRewardTierColor(targetTier);
  const nextMilestone =
    rewardScore < REWARD_THRESHOLDS.bronze
      ? REWARD_THRESHOLDS.bronze
      : rewardScore < REWARD_THRESHOLDS.silver
        ? REWARD_THRESHOLDS.silver
        : rewardScore < REWARD_THRESHOLDS.gold
          ? REWARD_THRESHOLDS.gold
          : null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(13,10,5,0.88)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
        overflow: "hidden",
      }}
    >
      {/* Minimalist background particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Ember
          key={i}
          style={{
            left: `${10 + i * 11}%`,
            bottom: `${5 + (i % 3) * 15}%`,
            width: 2,
            height: 2,
            background: "rgba(255, 255, 255, 0.15)",
          }}
        />
      ))}

      {/* Main panel with crack-reveal */}
      <div
        style={{
          background: "linear-gradient(145deg, #0a0a0a, #000000)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "32px 28px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 40px 80px rgba(0,0,0,0.8)",
          animation: visible ? "crackReveal 0.7s cubic-bezier(0.22,1,0.36,1) forwards" : "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Stone texture lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(217,119,6,0.025) 28px, rgba(217,119,6,0.025) 29px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: 40,
            height: 1,
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: 1,
            margin: "0 auto 32px",
          }}
        />

        {/* New high score burst */}
        {isNewHighScore && <StarBurst />}

        {/* New High Score badge */}
        {isNewHighScore && (
          <div
            style={{
              padding: "4px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            New Best Score
          </div>
        )}

        {/* Title */}
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            color: "#FEF3C7",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.1em",
            margin: "0 0 4px",
          }}
        >
          Temple Fallen
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#7A6647",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            margin: "0 0 24px",
          }}
        >
          {context.username || "GUARDIAN"}
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "24px 16px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
              marginBottom: 6,
            }}
          >
            Final Score
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 54,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1,
            }}
          >
            {displayScore.toLocaleString()}
          </div>
        </div>

        {/* Grade badge */}
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.15em",
            color: grade.color,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>{grade.emoji}</span>
          {grade.label}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Coins", value: `${Math.floor(score * 0.1)} 🪙`, color: "#D97706" },
            { label: "Distance", value: `${Math.round(score * 0.8)}m`, color: "#C4A882" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(13,10,5,0.6)",
                border: "1px solid rgba(217,119,6,0.12)",
                borderRadius: 12,
                padding: "10px 8px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(196,168,130,0.5)",
                  marginBottom: 4,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: stat.color,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {isSaving && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "rgba(255,255,255,0.4)",
              fontSize: 10,
              fontFamily: "'Inter', sans-serif",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#ffffff",
                animation: "opacityPulse 1s ease-in-out infinite",
              }}
            />
            Saving Records...
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <button
            id="retry-btn"
            onClick={onRestart}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid #ffffff",
              background: "#ffffff",
              color: "#000000",
            }}
          >
            Run Instance
          </button>

          <button
            id="share-btn"
            onClick={handleShare}
            disabled={shared}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              cursor: shared ? "not-allowed" : "pointer",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: shared ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
              transition: "all 0.2s",
            }}
          >
            {shared ? "✓ Cast Sent" : "💬 Share to Farcaster"}
          </button>

          <button
            id="back-home-btn"
            onClick={onBackToHome}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.5)",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            }}
          >
            🏠 Back to Home
          </button>
        </div>

        {/* Reward NFT section */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(217,119,6,0.15)",
            background: "rgba(13,10,5,0.5)",
            padding: "14px 14px 12px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#ffffff",
              }}
            >
              Session Reward
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#7A6647",
              }}
            >
              {eligibleWeek || weekKey}
            </span>
          </div>

          {/* Blockchain reward badge */}
          {targetTier > 0 && rewardClaimed && (
            <div
              className="glow-green"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(22,163,74,0.4)",
                background: "rgba(22,101,52,0.2)",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12 }}>🌿</span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#22C55E",
                }}
              >
                Reward Claimed: {targetTierLabel}
              </span>
            </div>
          )}

          {targetTier > 0 && !rewardClaimed && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(217,119,6,0.35)",
                background: "rgba(217,119,6,0.12)",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12 }}>🏺</span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#F59E0B",
                }}
              >
                Reward Unlocked: {targetTierLabel}
              </span>
            </div>
          )}

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: "#7A6647",
              margin: "0 0 4px",
            }}
          >
            Weekly best:{" "}
            <strong style={{ color: "#C4A882" }}>{bestScoreForWeek || score}</strong>
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              color: "#7A6647",
              margin: "0 0 6px",
            }}
          >
            Bronze {REWARD_THRESHOLDS.bronze}+ • Silver {REWARD_THRESHOLDS.silver}+ • Gold {REWARD_THRESHOLDS.gold}+
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: targetTierColor,
              margin: "0 0 10px",
            }}
          >
            Eligible tier: <strong>{targetTierLabel}</strong>
          </p>

          {targetTier === 0 && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "#7A6647",
                lineHeight: 1.5,
              }}
            >
              Need{" "}
              <strong style={{ color: "#D97706" }}>
                {Math.max(0, (nextMilestone ?? REWARD_THRESHOLDS.bronze) - rewardScore)}
              </strong>{" "}
              more points to unlock NFT reward.
            </div>
          )}

          {targetTier > 0 && rewardClaimed && (
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: "#22C55E",
                fontWeight: 600,
              }}
            >
              ✓ Reward claimed
              {walletOnRecord
                ? ` → ${walletOnRecord.slice(0, 6)}...${walletOnRecord.slice(-4)}`
                : ""}
            </div>
          )}

          {targetTier > 0 && !rewardClaimed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!isConnected && (
                <button
                  onClick={connectWallet}
                  disabled={isClaimBusy}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid rgba(217,119,6,0.35)",
                    background: "rgba(26,18,8,0.8)",
                    padding: "9px",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#C4A882",
                    cursor: "pointer",
                    opacity: isClaimBusy ? 0.6 : 1,
                  }}
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )}

              {isConnected && !onCorrectNetwork && (
                <button
                  onClick={claimReward}
                  disabled={isClaimBusy}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid rgba(194,65,12,0.45)",
                    background: "rgba(194,65,12,0.1)",
                    padding: "9px",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#F97316",
                    cursor: "pointer",
                    opacity: isClaimBusy ? 0.6 : 1,
                  }}
                >
                  {isSwitchingChain ? "Switching..." : "Switch To Sepolia"}
                </button>
              )}

              {isConnected && onCorrectNetwork && (
                <button
                  onClick={claimReward}
                  disabled={isClaimBusy || !REWARD_CONTRACT_ADDRESS}
                  className="glow-gold"
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid rgba(217,119,6,0.5)",
                    background: "rgba(217,119,6,0.15)",
                    padding: "9px",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#F59E0B",
                    cursor: "pointer",
                    opacity: isClaimBusy || !REWARD_CONTRACT_ADDRESS ? 0.6 : 1,
                  }}
                >
                  {isClaimSubmitting
                    ? "Confirm In Wallet..."
                    : isClaimMining
                      ? "Claiming..."
                      : isSyncingClaimStatus
                        ? "Syncing..."
                        : `⚔️ Claim ${targetTierLabel}`}
                </button>
              )}

              {claimHash && (
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 9,
                    color: "#7A6647",
                    textAlign: "center",
                  }}
                >
                  Tx: {claimHash.slice(0, 10)}...{claimHash.slice(-8)}
                </div>
              )}

              {claimError && (
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    color: "#C2410C",
                  }}
                >
                  {claimError}
                </div>
              )}
              {isCheckingClaimStatus && (
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 10,
                    color: "#7A6647",
                  }}
                >
                  Checking claim status...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
