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
    let prevPhase = engine.getSnapshot().phase;
    function frame(ts: number) {
      const dt = lastTs === null ? 16 : ts - lastTs;
      lastTs = ts;
      engine.tick(dt);
      const snapshot = engine.getSnapshot();
      // Admin restart (R / "초기화 후 재시작") jumps straight from
      // finale/completed back to playing - clear every finale-only visual
      // (particles, screen shake/flash, ambient sparkle timer) so nothing
      // from the battle-open hold screen leaks into the fresh game.
      if ((prevPhase === "finale" || prevPhase === "completed") && snapshot.phase === "playing") {
        renderer.reset();
      }
      prevPhase = snapshot.phase;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.render(ctx!, width, height, snapshot, engine.getClock());
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
