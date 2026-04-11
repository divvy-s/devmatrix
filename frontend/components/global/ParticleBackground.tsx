"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    // Adjust particle count based on screen size to maintain performance
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 15));
    
    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      density: number;
      colorOpBase: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.density = Math.random() * 20 + 1;
        this.colorOpBase = Math.random() * 0.5 + 0.1;
      }

      update() {
        // Natural movement
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around edges
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.y > canvas.height + 10) this.y = -10;
        if (this.y < -10) this.y = canvas.height + 10;

        // Mouse interaction (repel slightly, but connect with lines)
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        // Gentle attract to mouse if within radius, then repel if too close
        let maxDistance = 200;
        
        if (distance < maxDistance) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            let force = (maxDistance - distance) / maxDistance;
            
            // Constantly drawn to mouse slightly, giving the "move with cursor" effect
            let targetSpeedX = forceDirectionX * force * 1.5;
            let targetSpeedY = forceDirectionY * force * 1.5;
            
            this.x += targetSpeedX * 0.05 * this.density;
            this.y += targetSpeedY * 0.05 * this.density;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(0, 255, 136, ${this.colorOpBase})`; 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect particles with each other
        for (let j = i; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x;
          let dy = particles[i].y - particles[j].y;
          let distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            let opacity = 1 - (distance / 120);
            ctx.strokeStyle = `rgba(0, 255, 136, ${opacity * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.closePath();
          }
        }

        // Connect particles to mouse
        let mdx = mouse.x - particles[i].x;
        let mdy = mouse.y - particles[i].y;
        let mDistance = Math.sqrt(mdx * mdx + mdy * mdy);
        
        if (mDistance < 200) {
            ctx.beginPath();
            let opacity = 1 - (mDistance / 200);
            ctx.strokeStyle = `rgba(0, 212, 255, ${opacity * 0.6})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.closePath();
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [pathname]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] opacity-60"
    />
  );
};
