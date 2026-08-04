import { useEffect, useRef } from "react";
import { engine } from "../../state/gameStore";
import { useBattleTransition } from "../../hooks/useBattleTransition";
import { BattleParticleSystem } from "../../effects/battleTransition/battleParticles";
import { triggerBattleBurst } from "../../effects/battleTransition/burstSources";

const PALETTE = ["#e73716", "#ffc400", "#18bfe8", "#4bad16", "#f28c00", "#8734c5"];
const BATTLE_OPEN_AMBIENT_FIRST_DELAY = 2000;

function randomEdgePoint(w: number, h: number): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * w, y: -20 };
  if (side === 1) return { x: Math.random() * w, y: h + 20 };
  if (side === 2) return { x: -20, y: Math.random() * h };
  return { x: w + 20, y: Math.random() * h };
}

/**
 * The single full-viewport canvas that carries every pixel-fragment effect
 * in the battle-open transition: the board+panel burst (particles seeded
 * from each element's *real* on-screen position, see burstSources.ts), the
 * key-visual assembly convergence, the BATTLE STARTS NOW firework, and the
 * ambient sparkle during the persisted hold. One rAF loop for the whole
 * lifecycle - cheap to run continuously since it's a no-op when the
 * particle array is empty.
 */
export function BattleParticleField() {
  const { phase } = useBattleTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const systemRef = useRef(new BattleParticleSystem());
  const nextAmbientAtRef = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let lastTs: number | null = null;
    let avgDt = 16;
    const system = systemRef.current;

    function frame(ts: number) {
      const dt = lastTs === null ? 16 : Math.min(ts - lastTs, 80);
      lastTs = ts;
      avgDt = avgDt * 0.9 + dt * 0.1;
      // Auto-reduce particle budget on low-end screens instead of dropping frames.
      system.qualityScale = avgDt > 26 ? 0.45 : avgDt > 20 ? 0.7 : 1;

      if (phaseRef.current === "battleOpen" && ts >= nextAmbientAtRef.current) {
        const p = randomEdgePoint(width, height);
        const cx = width / 2;
        const cy = height * 0.42;
        const angle = Math.atan2(cy - p.y, cx - p.x) + (Math.random() - 0.5) * 0.6;
        system.spawnBatch(10, () => ({
          type: Math.random() < 0.5 ? "star" : "spark",
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * (60 + Math.random() * 90),
          vy: Math.sin(angle) * (60 + Math.random() * 90),
          size: 3 + Math.random() * 4,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          lifetime: 1400 + Math.random() * 900,
        }));
        nextAmbientAtRef.current = ts + 4000 + Math.random() * 2000;
      }

      system.update(dt, width, height);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      system.draw(ctx!);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const system = systemRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h * 0.42;

    if (phase === "idle") {
      system.clear();
      nextAmbientAtRef.current = 0;
      return;
    }

    if (phase === "readyPrompt") {
      system.spawnBatch(70, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 260 + Math.random() * 420;
        return {
          type: Math.random() < 0.5 ? "star" : "textPixel",
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 6,
          color: Math.random() < 0.5 ? "#ffffff" : PALETTE[Math.floor(Math.random() * PALETTE.length)],
          lifetime: 450 + Math.random() * 300,
        };
      });
      return;
    }

    if (phase === "burst") {
      const boardCanvas = document.querySelector<HTMLCanvasElement>(".game-canvas");
      triggerBattleBurst(system, engine.getSnapshot(), boardCanvas);
      return;
    }

    if (phase === "keyVisualAssembly") {
      // Scattered color rushes back toward center to seed the reveal...
      system.spawnBatch(110, () => {
        const { x, y } = randomEdgePoint(w, h);
        const angle = Math.atan2(cy - y, cx - x);
        const speed = 700 + Math.random() * 700;
        return {
          type: Math.random() < 0.5 ? "streak" : "star",
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 6 + Math.random() * 8,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          lifetime: 380 + Math.random() * 260,
          delay: Math.random() * 250,
        };
      });
      // ...then, once it's assembled, stars/streaks radiate back out from behind it.
      system.spawnBatch(90, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 180 + Math.random() * 380;
        return {
          type: Math.random() < 0.5 ? "star" : "streak",
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 6,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          lifetime: 650 + Math.random() * 450,
          delay: 750 + Math.random() * 250,
        };
      });
      return;
    }

    if (phase === "battleTextReveal") {
      system.spawnBatch(60, () => {
        const x = w / 2 + (Math.random() - 0.5) * w * 0.5;
        const y = h * 0.86;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        const speed = 220 + Math.random() * 360;
        return {
          type: Math.random() < 0.5 ? "blockPixel" : "spark",
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 6,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          lifetime: 500 + Math.random() * 400,
        };
      });
      nextAmbientAtRef.current = performance.now() + BATTLE_OPEN_AMBIENT_FIRST_DELAY;
      return;
    }
  }, [phase]);

  return <canvas ref={canvasRef} className="bt-particle-canvas" aria-hidden="true" />;
}
