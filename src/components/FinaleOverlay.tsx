import { useGameSnapshot } from "../state/gameStore";

/**
 * All finale visuals (title, glow, particle explosion, logo reveal) are
 * drawn directly on the canvas by rendering/renderer.ts for tight sync with
 * the particle system. This component only carries the accessible
 * announcement so screen readers get the same beat the audience sees.
 */
export function FinaleOverlay() {
  const snap = useGameSnapshot();
  const active = snap.phase === "finale" || snap.phase === "completed";
  return (
    <div className="sr-only" aria-live="polite">
      {active ? "ALL PLAYERS READY" : ""}
    </div>
  );
}
