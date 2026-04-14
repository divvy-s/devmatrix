"use client";

import { useEffect, useState } from "react";
import { LeaderboardEntry } from "@/types/game";

interface LeaderboardProps {
  currentFid: number;
  currentScore: number;
  refreshKey?: number;
}

type TabType = "weekly" | "alltime" | "friends";

// Mini sparkline bar chart (last 5 scores, simulated)
function Sparkline({ score, rank }: { score: number; rank: number }) {
  const bars = [0.4, 0.6, 0.5, 0.8, 1].map((f) => Math.round(score * f * (0.7 + rank * 0.05)));
  const max = Math.max(...bars);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 20 }}>
      {bars.map((v, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: `${Math.max(15, (v / max) * 100)}%`,
            background:
              i === bars.length - 1
                ? "rgba(255,255,255,0.7)"
                : `rgba(255,255,255,${0.1 + i * 0.1})`,
            borderRadius: 1,
            transition: "height 0.5s ease",
          }}
        />
      ))}
    </div>
  );
}

function CrownIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
        }}
      >
        <span
          style={{
            fontSize: 18,
            color: "#ffffff",
          }}
        >
          ●
        </span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "rgba(148,163,184,0.1)",
          border: "1px solid rgba(148,163,184,0.3)",
          fontSize: 14,
          fontWeight: 900,
          fontFamily: "'Cinzel', serif",
          color: "#94A3B8",
        }}
      >
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          color: "#71717a",
        }}
      >
        3
      </div>
    );
  }
  return (
    <div
      style={{
        width: 24,
        textAlign: "center",
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        color: "#7A6647",
      }}
    >
      {rank}
    </div>
  );
}

export default function Leaderboard({ currentFid, currentScore, refreshKey = 0 }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("weekly");

  useEffect(() => {
    setLoading(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard ?? []);
        setWeek(data.week ?? "");
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: "weekly", label: "Weekly", icon: "📅" },
    { key: "alltime", label: "All Time", icon: "🏛️" },
    { key: "friends", label: "Friends", icon: "🤝" },
  ];

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(0,0,0,0.9)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top minimal stripe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "rgba(255,255,255,0.15)",
        }}
      />

      {/* Stone texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(217,119,6,0.018) 32px, rgba(217,119,6,0.018) 33px)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ padding: "22px 20px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 22,
              filter: "drop-shadow(0 0 8px rgba(217,119,6,0.7))",
            }}
          >
            🏛️
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Wall of Champions
            </h3>
            {week && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  color: "#7A6647",
                  margin: "2px 0 0",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {week}
              </p>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "7px 6px",
                borderRadius: 10,
                border: activeTab === tab.key
                  ? "1px solid rgba(255,255,255,0.2)"
                  : "1px solid rgba(255,255,255,0.05)",
                background: activeTab === tab.key
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: activeTab === tab.key ? "#ffffff" : "rgba(255,255,255,0.3)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: tab.key === "friends" ? "default" : "pointer",
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {tab.key === "friends" && (
                <div
                  className="shimmer"
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.4,
                    borderRadius: 10,
                  }}
                />
              )}
              <span style={{ position: "relative" }}>
                {tab.icon} {tab.label}
                {tab.key === "friends" && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 7,
                      color: "#D97706",
                      verticalAlign: "super",
                    }}
                  >
                    SOON
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 14px 18px", position: "relative" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "36px 0",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "#ffffff",
                animation: "loadingSweep 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                color: "#7A6647",
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Reading The Stone...
            </span>
          </div>
        ) : entries.length === 0 ? (
          <div
            style={{
              padding: "36px 16px",
              textAlign: "center",
              background: "rgba(13,10,5,0.5)",
              borderRadius: 14,
              border: "1px solid rgba(217,119,6,0.08)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗿</div>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                color: "#7A6647",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              No records carved yet.
            </div>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                color: "#D97706",
                letterSpacing: "0.1em",
                marginTop: 6,
              }}
            >
              Claim the first legend.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entries.slice(0, 10).map((entry, idx) => {
              const isCurrentUser = entry.fid === currentFid;
              const isFirst = entry.rank === 1;
              const isTop3 = entry.rank <= 3;

              return (
                <div
                  key={entry.fid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: isCurrentUser
                      ? "1px solid rgba(255,255,255,0.3)"
                      : "1px solid rgba(255,255,255,0.05)",
                    background: isCurrentUser
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.4)",
                    animation: `slideInRow 0.4s ease-out ${idx * 0.07}s both`,
                    boxShadow: isCurrentUser
                      ? "0 0 12px rgba(217,119,6,0.15)"
                      : isFirst
                        ? "0 0 20px rgba(217,119,6,0.1)"
                        : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Rank */}
                  <div style={{ flexShrink: 0, width: 30 }}>
                    <CrownIcon rank={entry.rank} />
                  </div>

                  {/* User info */}
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: isCurrentUser ? "#F59E0B" : isFirst ? "#FEF3C7" : "#C4A882",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {entry.username}
                      </span>
                      {isCurrentUser && (
                        <span
                          style={{
                            background: "#D97706",
                            color: "#0D0A05",
                            fontSize: 7,
                            fontWeight: 900,
                            fontFamily: "'Cinzel', serif",
                            padding: "2px 5px",
                            borderRadius: 4,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            flexShrink: 0,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    {/* FID as wallet-style address */}
                    {entry.fid > 0 && (
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 9,
                          color: "#7A6647",
                          marginTop: 1,
                          letterSpacing: "0.05em",
                        }}
                      >
                        fid:{String(entry.fid).padStart(6, "0")}
                      </div>
                    )}
                  </div>

                  {/* Sparkline */}
                  <div style={{ flexShrink: 0 }}>
                    <Sparkline score={entry.score} rank={entry.rank} />
                  </div>

                  {/* Score */}
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: 60 }}>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 16,
                        fontWeight: 700,
                        color: isFirst || isCurrentUser ? "#ffffff" : "#71717a",
                        lineHeight: 1,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {entry.score.toLocaleString()}
                    </div>
                    {/* Simulated $SPRINT earned */}
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 9,
                        color: "#166534",
                        marginTop: 2,
                      }}
                    >
                      +{Math.floor(entry.score * 0.05)} $S
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Current player not in leaderboard */}
        {currentScore > 0 && !entries.find((e) => e.fid === currentFid) && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(217,119,6,0.08)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#7A6647" }}>Your best:</span>
            <strong style={{ color: "#D97706", fontFamily: "'Cinzel', serif" }}>
              {currentScore.toLocaleString()}
            </strong>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 8,
                color: "#4A3318",
                background: "rgba(217,119,6,0.1)",
                border: "1px solid rgba(217,119,6,0.15)",
                borderRadius: 4,
                padding: "2px 5px",
                letterSpacing: "0.1em",
              }}
            >
              UNRANKED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
