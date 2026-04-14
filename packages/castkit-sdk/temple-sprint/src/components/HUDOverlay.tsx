"use client";

import { useEffect, useRef, useState } from "react";

interface HUDOverlayProps {
  score: number;
  lives: number;
  coins?: number;
  speedMultiplier?: number;
  powerUpActive?: boolean;
  powerUpTimeLeft?: number; // 0-1 representing remaining fraction
}

function GemLife({ active, index }: { active: boolean; index: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        animationDelay: `${index * 0.2}s`,
      }}
    >
      <div
        style={{
          fontSize: 22,
          transition: "all 0.3s ease",
          animation: !active ? "gemCrack 0.5s ease-out forwards" : undefined,
          filter: active
            ? "drop-shadow(0 0 6px rgba(217,119,6,0.9))"
            : "grayscale(1) brightness(0.4)",
        }}
      >
        {active ? "💎" : "🪨"}
      </div>
    </div>
  );
}

function PowerUpRing({ timeLeft }: { timeLeft: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - timeLeft);

  return (
    <div className="hud-panel px-2 py-1.5 flex items-center gap-1.5">
      <svg width={38} height={38} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={19}
          cy={19}
          r={radius}
          fill="none"
          stroke="rgba(217,119,6,0.2)"
          strokeWidth={3}
        />
        {/* Progress ring */}
        <circle
          cx={19}
          cy={19}
          r={radius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
        {/* Center icon */}
        <text x={19} y={23} textAnchor="middle" fontSize={12} style={{ transform: "rotate(90deg)", transformOrigin: "19px 19px", fill: "#FEF3C7" }}>
          ⚡
        </text>
      </svg>
    </div>
  );
}

export default function HUDOverlay({
  score,
  lives,
  coins = 0,
  speedMultiplier = 1,
  powerUpActive = false,
  powerUpTimeLeft = 0,
}: HUDOverlayProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [scorePulsing, setScorePulsing] = useState(false);
  const prevScoreRef = useRef(0);
  const [distancePct, setDistancePct] = useState(0);

  // Score count-up animation
  useEffect(() => {
    const target = score;
    const prev = prevScoreRef.current;
    if (target === prev) return;

    // Pulse on milestones
    const milestones = [100, 250, 500, 1000, 2000, 5000];
    const crossed = milestones.some((m) => prev < m && target >= m);
    if (crossed) {
      setScorePulsing(true);
      setTimeout(() => setScorePulsing(false), 400);
    }

    // Smooth count-up
    const diff = target - prev;
    const steps = Math.min(Math.abs(diff), 15);
    const step = diff / steps;
    let current = prev;
    let i = 0;

    const interval = setInterval(() => {
      i++;
      current += step;
      setDisplayScore(Math.round(i === steps ? target : current));
      if (i >= steps) {
        clearInterval(interval);
        prevScoreRef.current = target;
      }
    }, 30);

    return () => clearInterval(interval);
  }, [score]);

  // Distance meter based on score
  useEffect(() => {
    const pct = Math.min(1, score / 2000);
    setDistancePct(pct);
  }, [score]);

  const speedColor =
    speedMultiplier >= 3
      ? "#C2410C"
      : speedMultiplier >= 2
      ? "#F59E0B"
      : "#D97706";

  return (
    <div className="pointer-events-none absolute inset-0 z-30 p-3">
      {/* === TOP CENTER: Score === */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 hud-panel px-5 py-2 text-center min-w-[120px]"
        style={{ zIndex: 31 }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(217,119,6,0.8)",
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          SCORE
        </div>
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 26,
            fontWeight: 900,
            color: scorePulsing ? "#F59E0B" : "#FEF3C7",
            lineHeight: 1,
            textShadow: scorePulsing
              ? "0 0 20px rgba(217,119,6,0.9), 0 0 40px rgba(217,119,6,0.5)"
              : "none",
            transition: "color 0.2s, text-shadow 0.2s",
            transform: scorePulsing ? "scale(1.1)" : "scale(1)",
            display: "block",
          }}
        >
          {displayScore.toLocaleString()}
        </div>
      </div>

      {/* === LEFT: Distance Bar === */}
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 hud-panel px-2 py-3 flex flex-col items-center gap-2"
        style={{ zIndex: 31 }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(217,119,6,0.7)",
            textTransform: "uppercase",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            fontWeight: 600,
          }}
        >
          DIST
        </div>

        {/* Bar track */}
        <div
          style={{
            width: 10,
            height: 100,
            background: "rgba(217,119,6,0.1)",
            borderRadius: 5,
            border: "1px solid rgba(217,119,6,0.3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Fill */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${distancePct * 100}%`,
              background:
                "linear-gradient(to top, #D97706, #F59E0B, #FEF3C7)",
              borderRadius: 5,
              transition: "height 0.5s ease",
              boxShadow: "0 0 8px rgba(217,119,6,0.6)",
            }}
          />
        </div>

        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 9,
            color: "#D97706",
            fontWeight: 700,
          }}
        >
          {Math.round(score * 0.8)}m
        </div>
      </div>

      {/* === TOP RIGHT: Coins === */}
      <div
        className="absolute top-3 right-3 hud-panel px-3 py-2 flex items-center gap-2"
        style={{ zIndex: 31 }}
      >
        <span
          className="coin-spin"
          style={{ fontSize: 18, display: "inline-block" }}
        >
          🪙
        </span>
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#FEF3C7",
          }}
        >
          {coins}
        </span>
      </div>

      {/* === BOTTOM LEFT: Lives === */}
      <div
        className="absolute bottom-3 left-3 hud-panel px-3 py-2 flex items-center gap-1"
        style={{ zIndex: 31 }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <GemLife key={i} active={i < lives} index={i} />
        ))}
      </div>

      {/* === BOTTOM CENTER: Speed Badge === */}
      {speedMultiplier > 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 hud-panel px-3 py-1.5 flex items-center gap-1.5"
          style={{
            zIndex: 31,
            border: `1px solid ${speedColor}`,
            animation:
              speedMultiplier >= 2 ? "speedBadge 1s ease-in-out infinite" : undefined,
          }}
        >
          <span style={{ fontSize: 14 }}>⚡</span>
          <span
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 13,
              fontWeight: 800,
              color: speedColor,
              letterSpacing: "0.1em",
            }}
          >
            {speedMultiplier.toFixed(1)}×
          </span>
        </div>
      )}

      {/* === BOTTOM RIGHT: Power-up timer === */}
      {powerUpActive && powerUpTimeLeft > 0 && (
        <div className="absolute bottom-3 right-3" style={{ zIndex: 31 }}>
          <PowerUpRing timeLeft={powerUpTimeLeft} />
        </div>
      )}
    </div>
  );
}
