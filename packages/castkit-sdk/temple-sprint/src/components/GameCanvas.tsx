"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GamePhase } from "@/types/game";

const GAME_W = 800;
const GAME_H = 620;

interface GameCanvasProps {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  phase: GamePhase;
  onPhaseChange: (phase: GamePhase) => void;
}

export default function GameCanvas({
  onGameOver,
  onScoreUpdate,
  phase,
  onPhaseChange,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<import("@/game").BoxyRunScene | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [liveScore, setLiveScore] = useState(0);

  const startGame = useCallback(async () => {
    if (sceneRef.current || !containerRef.current) return;

    const { BoxyRunScene } = await import("@/game");

    sceneRef.current = new BoxyRunScene(containerRef.current, {
      onScoreUpdate: (score: number) => {
        setLiveScore(score);
        onScoreUpdate(score);
      },
      onGameOver: (score: number) => {
        onGameOver(score);
        onPhaseChange("dead");
      },
    });

    setIsReady(true);
  }, [onGameOver, onScoreUpdate, onPhaseChange]);

  useEffect(() => {
    if (phase === "playing") {
      startGame();
    }
    return () => {
      if (phase === "idle" || phase === "dead") {
        sceneRef.current?.destroy();
        sceneRef.current = null;
        setIsReady(false);
      }
    };
  }, [phase, startGame]);

  // Handle Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sceneRef.current) return;
      const key = e.key.toLowerCase();
      if (key === "arrowup" || key === "w") sceneRef.current.handleInput("up");
      if (key === "arrowleft" || key === "a") sceneRef.current.handleInput("left");
      if (key === "arrowright" || key === "d") sceneRef.current.handleInput("right");
    };

    const handleTouchStart = (e: TouchEvent) => {
      swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!swipeRef.current || !sceneRef.current) return;
      const dx = e.changedTouches[0].clientX - swipeRef.current.x;
      const dy = e.changedTouches[0].clientY - swipeRef.current.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) sceneRef.current.handleInput("right");
        else if (dx < -30) sceneRef.current.handleInput("left");
      } else {
        if (dy < -30) sceneRef.current.handleInput("up");
      }
      swipeRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: GAME_W,
        height: "100%",
        maxHeight: GAME_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
      }}
    >
      <div
        ref={containerRef}
        id="game-container"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgba(217,119,6,0.3), inset 0 0 80px rgba(13,10,5,0.8), 0 20px 40px -10px rgba(0,0,0,0.8), 0 0 60px rgba(217,119,6,0.15)",
          background: "#100C06",
          position: "relative",
        }}
      />

      {/* --- MINIMALIST DARK UI OVERLAY --- */}
      {isReady && phase === "playing" && (
        <>
          {/* Top HUD Area */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              right: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {/* Minimalist Score */}
            <div
              style={{
                background: "rgba(0, 0, 0, 0.8)",
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Score
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                {liveScore.toLocaleString()}
              </span>
            </div>

            {/* Back to Menu Button */}
            <button
              onClick={() => onPhaseChange("idle")}
              style={{
                pointerEvents: "auto",
                background: "rgba(0, 0, 0, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                padding: "8px 14px",
                color: "#ffffff",
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)")}
            >
              <span style={{ fontSize: 14 }}>🏠</span>
              Menu
            </button>
          </div>

          {/* Minimalist Bottom Info */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "rgba(0, 0, 0, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                padding: "6px 16px",
                borderRadius: 999,
                display: "flex",
                gap: 20,
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 8, fontSize: 10, color: "rgba(255, 255, 255, 0.3)" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>W</span> JUMP
              </div>
              <div style={{ width: 1, height: 10, background: "rgba(255, 255, 255, 0.1)" }} />
              <div style={{ display: "flex", gap: 8, fontSize: 10, color: "rgba(255, 255, 255, 0.3)" }}>
                <span style={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 700 }}>A/D</span> MOVE
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}