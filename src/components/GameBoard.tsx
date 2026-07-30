import { useEffect, useRef } from "react";
import { engine, useGameSnapshot } from "../state/gameStore";
import { GameRenderer } from "../rendering/renderer";
import { PixelFrame } from "./PixelFrame";

/**
 * The board itself: a full-bleed canvas inside its own panel, driving its own
 * requestAnimationFrame loop (ticks the engine + draws every frame).
 */
export function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snap = useGameSnapshot();

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderer = new GameRenderer();
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = parent!.clientWidth;
      height = parent!.clientHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);

    let raf = 0;
    let lastTs: number | null = null;
    function frame(ts: number) {
      const dt = lastTs === null ? 16 : ts - lastTs;
      lastTs = ts;
      engine.tick(dt);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.render(ctx!, width, height, engine.getSnapshot(), engine.getClock());
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <PixelFrame className="board-panel">
      <canvas ref={canvasRef} className="game-canvas" />
      {snap.phase === "paused" && <div className="board-overlay-message">PAUSED</div>}
      {snap.phase === "setup" && <div className="board-overlay-message">PRESS ESC FOR ADMIN</div>}
    </PixelFrame>
  );
}
