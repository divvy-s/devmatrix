"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useFarcaster } from "@/hooks/useFarcaster";
import ScoreScreen from "@/components/ScoreScreen";
import Leaderboard from "@/components/Leaderboard";
import HUDOverlay from "@/components/HUDOverlay";
import ParticleCanvas from "@/components/ParticleCanvas";
import CharacterShop from "@/components/CharacterShop";
import PrivyLoginButton from "@/components/PrivyLoginButton";
import { GamePhase } from "@/types/game";

const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

// Dynamically import GameCanvas so Phaser never runs on the server
const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        width: "100%",
        background: "rgba(0, 0, 0, 0.95)",
        borderRadius: 24,
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          borderTopColor: "#ffffff",
          animation: "loadingSweep 0.8s linear infinite",
          marginBottom: 16,
        }}
      />
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        Loading Instance...
      </span>
    </div>
  ),
});

// === PARALLAX LAYER ===
function ParallaxBg({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Layer 1: Deep background — distant mountains/ruins */}
      <div
        style={{
          position: "absolute",
          inset: "-5%",
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,255,255,0.03) 0%, transparent 70%)
          `,
          transform: `translate(${mouseX * -8}px, ${mouseY * -5}px)`,
          transition: "transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      />

      {/* Layer 2: Mid — temple silhouette columns */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55%",
          transform: `translate(${mouseX * -20}px, ${mouseY * -12}px)`,
          transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {/* Temple columns */}
        {[8, 18, 30, 45, 58, 72, 85, 93].map((left, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left: `${left}%`,
              width: i % 2 === 0 ? 18 : 12,
              height: `${40 + (i % 3) * 20}%`,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4), transparent)",
              borderRadius: "4px 4px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          />
        ))}

        {/* Temple arch */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 200,
            height: 140,
            background: "linear-gradient(to top, rgba(26,18,8,0.95), rgba(26,18,8,0.4))",
            clipPath:
              "polygon(0% 100%, 15% 40%, 30% 10%, 50% 0%, 70% 10%, 85% 40%, 100% 100%)",
          }}
        />
      </div>

      {/* Layer 3: Foreground — jungle vines/foliage */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "25%",
          transform: `translate(${mouseX * -35}px, ${mouseY * -20}px)`,
          transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          background:
            "linear-gradient(to top, rgba(22,101,52,0.25), rgba(22,101,52,0.08), transparent)",
        }}
      />

      {/* Ambient glow top */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "50%",
          background:
            "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// === RUNNER SILHOUETTE ===
function RunnerSilhouette() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 60,
        left: 0,
        right: 0,
        height: 50,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          animation: "runnerSprint 8s linear infinite",
          animationDelay: "1s",
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        {/* Silhouette figure */}
        <div
          style={{
            fontSize: 32,
            filter: "grayscale(1) brightness(0.5)",
            animation: "runStep 0.25s ease-in-out infinite",
            opacity: 0.3,
          }}
        >
          🏃
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { context, isLoaded, isFarcaster, shareScore } = useFarcaster();
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [lives] = useState(3);
  const [coins] = useState(0);

  // Parallax mouse tracking
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const mouseMoveRef = useRef<(e: MouseEvent) => void>(() => { });

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "https://temple-sprint.vercel.app";

  useEffect(() => {
    mouseMoveRef.current = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouseX(x);
      setMouseY(y);
    };

    const handler = (e: MouseEvent) => mouseMoveRef.current(e);
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const handleScoreUpdate = useCallback((s: number) => {
    setScore(s);
  }, []);

  const handleGameOver = useCallback(
    async (s: number) => {
      setFinalScore(s);
      setIsSaving(true);
      try {
        const response = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid: context.fid, score: s, username: context.username }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || "Score save failed");
        }
      } catch {
        console.warn("Score save failed");
      } finally {
        setIsSaving(false);
        setLeaderboardRefreshKey((v) => v + 1);
      }
    },
    [context]
  );

  const handleStart = () => {
    setScore(0);
    setFinalScore(0);
    setPhase("playing");
    setShowLeaderboard(false);
  };

  const handleRestart = useCallback(() => {
    setScore(0);
    setFinalScore(0);
    setPhase("playing");
  }, []);

  const handleShare = useCallback(() => {
    shareScore(finalScore, appUrl);
  }, [shareScore, finalScore, appUrl]);

  const handleBackToHome = useCallback(() => {
    setPhase("idle");
    setScore(0);
    setFinalScore(0);
    setShowLeaderboard(false);
    setShowShop(false);
  }, []);

  if (!isLoaded) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0D0A05",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          color: "#FEF3C7",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              border: "3px solid rgba(217,119,6,0.2)",
              borderTopColor: "#D97706",
              animation: "loadingSweep 0.8s linear infinite",
              boxShadow: "0 0 20px rgba(217,119,6,0.3)",
            }}
          />
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              color: "rgba(217,119,6,0.8)",
              fontSize: 12,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            Awakening...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0D0A05",
        color: "#FEF3C7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowX: "hidden",
        position: "relative",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Parallax background */}
      {phase === "idle" && <ParallaxBg mouseX={mouseX} mouseY={mouseY} />}

      {/* Gold dust particles overlay */}
      <ParticleCanvas type="both" intensity={4} />

      {/* Runner silhouette on idle */}
      {phase === "idle" && <RunnerSilhouette />}

      {/* ===== TOP NAV ===== */}
      <header
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          position: "relative",
          zIndex: 20,
        }}
      >
        {/* Logo - Clickable to go home */}
        <div 
          onClick={phase !== "idle" ? handleBackToHome : undefined}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 10, 
            cursor: phase !== "idle" ? "pointer" : "default" 
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(13,10,5,1))",
              border: "1px solid rgba(217,119,6,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(217,119,6,0.2)",
              fontSize: 20,
            }}
          >
            🏺
          </div>
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: "0.08em",
              color: "#FEF3C7",
            }}
          >
            Temple
            <span style={{ color: "#D97706", animation: "amberFlicker 6s ease-in-out infinite" }}>
              Sprint
            </span>
          </span>
        </div>

        {/* Right side nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {PRIVY_ENABLED && <PrivyLoginButton />}

          {phase === "playing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "rgba(217,119,6,0.7)",
                }}
              >
                Score
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "#FEF3C7",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                {score}
              </span>
            </div>
          )}

          {/* User badge */}
          <div
            className="hud-panel"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                color: "#C4A882",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {context.username || "Guest"}
            </span>
            {isFarcaster && (
              <span
                style={{
                  background: "#D97706",
                  color: "#0D0A05",
                  fontSize: 8,
                  fontWeight: 900,
                  fontFamily: "'Cinzel', serif",
                  padding: "2px 5px",
                  borderRadius: 4,
                  letterSpacing: "0.1em",
                }}
              >
                FC
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ===== IDLE SCREEN ===== */}
      {phase === "idle" && (
        <div
          style={{
            width: "100%",
            maxWidth: 900,
            padding: "40px 24px 80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Badge */}
          <div
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 28,
            }}
          >
            Endless Runner Instance
          </div>

          {/* Main title */}
          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(42px, 8vw, 72px)",
              fontWeight: 900,
              letterSpacing: "0.04em",
              textAlign: "center",
              margin: "0 0 16px",
              lineHeight: 1.1,
              color: "#ffffff",
              textShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            Outrun The Temple
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.5)",
              fontSize: 15,
              maxWidth: 520,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 44,
              letterSpacing: "0.01em",
            }}
          >
            Navigate treacherously fast corridors and dodge obstacles to claim your place on the{" "}
            <span style={{ color: "#ffffff", fontWeight: 600 }}>Wall of Champions</span>.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", marginBottom: 52 }}>
            <button
              id="start-game-btn"
              onClick={handleStart}
              className="temple-btn"
              style={{
                width: 280,
                padding: "16px 32px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                letterSpacing: "0.12em",
              }}
            >
              <span style={{ fontSize: 20 }}>🏃</span>
              Enter The Temple
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                id="view-leaderboard-btn"
                onClick={() => setShowLeaderboard((v) => !v)}
                className="temple-btn"
                style={{
                  width: 178,
                  padding: "11px 20px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  borderColor: "rgba(217,119,6,0.4)",
                }}
              >
                <span>🏆</span>
                Wall of Champions
              </button>

              <button
                id="open-shop-btn"
                onClick={() => setShowShop(true)}
                className="temple-btn"
                style={{
                  width: 136,
                  padding: "11px 20px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                  borderColor: "rgba(217,119,6,0.4)",
                }}
              >
                <span>🏺</span>
                Vault
              </button>
            </div>
          </div>

          {/* Controls card */}
          <div
            style={{
              width: "100%",
              maxWidth: 700,
              background: "linear-gradient(145deg, rgba(26,18,8,0.6), rgba(13,10,5,0.8))",
              border: "1px solid rgba(217,119,6,0.15)",
              borderRadius: 24,
              padding: "32px 28px",
              backdropFilter: "blur(16px)",
              marginBottom: 36,
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
                  "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(217,119,6,0.03) 24px, rgba(217,119,6,0.03) 25px)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 24,
                position: "relative",
              }}
            >
              {[
                { icon: "↔️", title: "Dodge", desc: "Swipe Left/Right to switch lanes or turn tight corners" },
                { icon: "⬆️", title: "Leap", desc: "Swipe Up to jump over blockades and temple gaps" },
                { icon: "⬇️", title: "Slide", desc: "Swipe Down to duck beneath ancient hanging traps" },
              ].map((ctrl, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    borderLeft: i > 0 ? "1px solid rgba(217,119,6,0.08)" : undefined,
                    paddingLeft: i > 0 ? 24 : 0,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "rgba(13,10,5,0.8)",
                      border: "1px solid rgba(217,119,6,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      marginBottom: 12,
                      boxShadow: "0 0 12px rgba(217,119,6,0.15)",
                    }}
                  >
                    {ctrl.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Cinzel', serif",
                      color: "#FEF3C7",
                      fontSize: 15,
                      fontWeight: 700,
                      marginBottom: 6,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {ctrl.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: "#7A6647",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {ctrl.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          {showLeaderboard && (
            <div
              style={{
                width: "100%",
                maxWidth: 560,
                animation: "slideInRow 0.5s ease-out",
              }}
            >
              <Leaderboard
                currentFid={context.fid}
                currentScore={0}
                refreshKey={leaderboardRefreshKey}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== PLAYING / DEAD STATE ===== */}
      {(phase === "playing" || phase === "dead") && (
        <div
          style={{
            width: "100%",
            maxWidth: 1080,
            padding: "0 12px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            zIndex: 10,
            flex: 1,
          }}
        >
          {/* ── Game frame ── */}
          <div
            style={{
              position: "relative",
              width: "100%",
              // Aspect ratio: 800 / 620 ≈ 1.29
              aspectRatio: "800 / 620",
              maxHeight: "calc(100vh - 160px)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(217,119,6,0.35)",
              background: "#100C06",
              boxShadow: [
                "0 0 0 1px rgba(217,119,6,0.1)",
                "0 0 80px rgba(217,119,6,0.12)",
                "0 40px 100px rgba(0,0,0,0.7)",
                "inset 0 0 0 1px rgba(217,119,6,0.08)",
              ].join(", "),
            }}
          >
            {/* Temple pillar corner accents */}
            {([
              { top: 0, left: 0, borderRadius: "12px 0 8px 0" },
              { top: 0, right: 0, borderRadius: "0 12px 0 8px" },
              { bottom: 0, left: 0, borderRadius: "0 8px 0 12px" },
              { bottom: 0, right: 0, borderRadius: "8px 0 12px 0" },
            ] as React.CSSProperties[]).map((pos, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 32,
                  height: 32,
                  background: "linear-gradient(135deg, rgba(217,119,6,0.6), rgba(194,65,12,0.3))",
                  boxShadow: "0 0 14px rgba(217,119,6,0.5)",
                  zIndex: 40,
                  ...pos,
                }}
              />
            ))}

            {/* Subtle top-edge border */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: "rgba(255,255,255,0.1)",
                zIndex: 40,
                pointerEvents: "none",
              }}
            />

            {/* Game canvas — fills frame exactly */}
            <div style={{ position: "absolute", inset: 0 }}>
              <GameCanvas
                onGameOver={handleGameOver}
                onScoreUpdate={handleScoreUpdate}
                phase={phase}
                onPhaseChange={setPhase}
              />
            </div>

            {/* HUD Overlay — floating on top of game */}
            {phase === "playing" && (
              <HUDOverlay
                score={score}
                lives={lives}
                coins={coins}
                speedMultiplier={score > 500 ? 1 + Math.floor(score / 500) * 0.5 : 1}
              />
            )}

            {/* Score screen on death */}
            {phase === "dead" && (
              <ScoreScreen
                score={finalScore}
                context={context}
                onRestart={handleRestart}
                onShare={handleShare}
                onBackToHome={handleBackToHome}
                isSaving={isSaving}
              />
            )}
          </div>

          {/* Control hint strip */}
          <div
            style={{
              marginTop: 10,
              padding: "6px 18px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            ⬅ WASD OR ARROWS TO MOVE — SPACE OR UP TO JUMP ➡
          </div>

          {/* Post-game leaderboard */}
          {phase === "dead" && (
            <div
              style={{
                width: "100%",
                maxWidth: 560,
                marginTop: 28,
                animation: "slideInRow 0.6s ease-out 0.2s both",
              }}
            >
              <Leaderboard
                currentFid={context.fid}
                currentScore={finalScore}
                refreshKey={leaderboardRefreshKey}
              />
            </div>
          )}
        </div>
      )}

      {/* Character Shop Modal */}
      {showShop && <CharacterShop onClose={() => setShowShop(false)} currentFid={context.fid} />}
    </main>
  );
}
