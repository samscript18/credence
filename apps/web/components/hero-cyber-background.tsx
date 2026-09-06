"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export function HeroCyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates (normalized)
    const mouse = { x: width * 0.5, y: height * 0.35, active: false };

    // Responsive node count
    const nodeCount = Math.min(Math.floor((width * height) / 18000), 55);
    const nodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.4 + 0.35,
        pulseSpeed: Math.random() * 0.03 + 0.015,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Concentric shockwaves
    const waves: PulseWave[] = [];
    let lastWaveSpawn = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.018;

      ctx.clearRect(0, 0, width, height);

      // 1. Perspective Cyber Grid at the lower half
      const horizonY = height * 0.38;
      const gridSpacing = 50;
      const gridOffset = (time * 25) % gridSpacing;

      ctx.save();
      ctx.strokeStyle = "rgba(155, 220, 255, 0.04)";
      ctx.lineWidth = 1;

      // Moving horizontal perspective lines
      for (let y = horizonY; y < height; y += gridSpacing) {
        const progress = (y - horizonY) / (height - horizonY);
        const dynamicY = horizonY + Math.pow(progress, 1.8) * (height - horizonY);
        const lineOffset = (dynamicY + gridOffset) % (height - horizonY);
        const finalY = horizonY + lineOffset;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(155, 220, 255, ${0.015 + ((finalY - horizonY) / height) * 0.06})`;
        ctx.moveTo(0, finalY);
        ctx.lineTo(width, finalY);
        ctx.stroke();
      }

      // Vanishing point diagonal grid rays
      const vpX = width * 0.5;
      const vpY = horizonY - 40;
      const numRays = 18;
      for (let i = -numRays; i <= numRays; i++) {
        const bottomX = vpX + i * 90;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(155, 220, 255, 0.03)";
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Concentric Radar Pulse Shockwaves
      if (Date.now() - lastWaveSpawn > 2800) {
        waves.push({
          x: width * 0.5,
          y: height * 0.3,
          radius: 20,
          maxRadius: Math.max(width, height) * 0.65,
          alpha: 0.35,
          speed: 2.2,
        });
        lastWaveSpawn = Date.now();
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        if (!wave) continue;
        wave.radius += wave.speed;
        wave.alpha = (1 - wave.radius / wave.maxRadius) * 0.35;

        if (wave.radius >= wave.maxRadius || wave.alpha <= 0) {
          waves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(155, 220, 255, ${wave.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Secondary subtle inner echo ring
        if (wave.radius > 40) {
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius - 24, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${wave.alpha * 0.4})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Connect close nodes with glowing laser vectors
      const connectionDist = 135;
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];
        if (!nodeA) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          if (!nodeB) continue;
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const lineAlpha = (1 - dist / connectionDist) * 0.22;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(155, 220, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.stroke();
          }
        }
      }

      // 4. Update and draw nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce from edges
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Mouse gravity interaction
        if (mouse.active) {
          const mdx = mouse.x - node.x;
          const mdy = mouse.y - node.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 160) {
            const force = (1 - mDist / 160) * 0.8;
            node.x -= (mdx / mDist) * force * 1.5;
            node.y -= (mdy / mDist) * force * 1.5;

            // Draw interactive laser beam to cursor
            ctx.beginPath();
            ctx.strokeStyle = `rgba(155, 220, 255, ${(1 - mDist / 160) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        const pulse = Math.sin(time * node.pulseSpeed * 60 + node.pulseOffset);
        const currentAlpha = node.baseAlpha + pulse * 0.25;
        const currentRadius = node.radius + pulse * 0.8;

        // Outer glow halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(155, 220, 255, ${Math.max(0, currentAlpha * 0.15)})`;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, currentAlpha * 0.9)})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Dynamic Canvas with particles, perspective grid & radar shockwaves */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        style={{
          maskImage:
            "linear-gradient(180deg, black 0%, black 75%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, black 0%, black 75%, transparent 100%)",
        }}
      />

      {/* Cybernetic Aurora Beams (Rotating Deep Plasma Light) */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[850px] h-[480px] pointer-events-none">
        <div
          className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(155,220,255,0.22)_0%,rgba(56,189,248,0.1)_45%,transparent_75%)] blur-3xl"
          style={{ animation: "aurora-wave-1 9s ease-in-out infinite" }}
        />
        <div
          className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.18)_0%,rgba(96,165,250,0.08)_50%,transparent_75%)] blur-3xl"
          style={{ animation: "aurora-wave-2 11s ease-in-out infinite" }}
        />
      </div>

      {/* Scanning Horizontal Laser Beam that sweeps vertically */}
      <div className="absolute inset-x-0 top-0 h-96 overflow-hidden pointer-events-none opacity-40">
        <div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent"
          style={{
            animation: "laser-comet 6s ease-in-out infinite",
            filter: "drop-shadow(0 0 10px #9bdcff)",
          }}
        />
      </div>
    </div>
  );
}
