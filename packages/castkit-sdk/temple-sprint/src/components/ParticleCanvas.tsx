"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  type: "dust" | "ember";
}

interface ParticleCanvasProps {
  type?: "dust" | "ember" | "both";
  intensity?: number; // 1-10
  className?: string;
}

export default function ParticleCanvas({
  type = "both",
  intensity = 5,
  className = "",
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const GOLD_COLORS = ["#D97706", "#F59E0B", "#FEF3C7", "#FBBF24", "#B45309"];
    const EMBER_COLORS = ["#C2410C", "#DC2626", "#F97316", "#D97706", "#FCA5A5"];
    const SPAWN_RATE = Math.max(1, Math.round(6 - intensity * 0.5));

    let frame = 0;

    const spawnParticle = (): Particle => {
      const isEmber = type === "ember" || (type === "both" && Math.random() > 0.6);
      const colors = isEmber ? EMBER_COLORS : GOLD_COLORS;
      const maxLife = isEmber ? 120 + Math.random() * 80 : 200 + Math.random() * 150;

      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(0.5 + Math.random() * 1.5),
        size: isEmber ? 2 + Math.random() * 3 : 1 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife,
        type: isEmber ? "ember" : "dust",
      };
    };

    const maxParticles = intensity * 12;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Spawn new particles
      if (frame % SPAWN_RATE === 0 && particlesRef.current.length < maxParticles) {
        if (type !== "ember") particlesRef.current.push(spawnParticle());
        if (type !== "dust" && Math.random() > 0.5) particlesRef.current.push(spawnParticle());
      }

      // Update & draw
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        if (p.life >= p.maxLife) return false;

        const progress = p.life / p.maxLife;
        const alpha = p.opacity * (1 - progress);

        // Slight wobble
        p.vx += (Math.random() - 0.5) * 0.04;
        p.x += p.vx;
        p.y += p.vy;

        // Draw
        ctx.save();
        ctx.globalAlpha = alpha;

        if (p.type === "ember") {
          // Glowing ember dot
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Gold dust sparkle
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4;

          // Star shape for larger particles
          if (p.size > 1.5) {
            const s = p.size;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
              const angle = (i * Math.PI) / 2 + (p.life * 0.05);
              const r = i % 2 === 0 ? s : s * 0.4;
              if (i === 0) ctx.moveTo(p.x + r * Math.cos(angle), p.y + r * Math.sin(angle));
              else ctx.lineTo(p.x + r * Math.cos(angle), p.y + r * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
        return true;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      particlesRef.current = [];
    };
  }, [type, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
}
