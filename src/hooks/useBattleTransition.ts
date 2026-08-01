import type { CSSProperties } from "react";
import { useGameSnapshot } from "../state/gameStore";
import { BATTLE_TRANSITION_TIMING, type BattleTransitionPhase } from "../effects/battleTransition/transitionTimeline";

export interface BattleTransitionInfo {
  phase: BattleTransitionPhase;
  logoUrl: string | null;
  /** This step's duration in ms (from the single BATTLE_TRANSITION_TIMING config), as a ready-to-use CSS custom property. */
  style: CSSProperties;
}

/**
 * Derives the DOM-facing battle transition phase from the engine snapshot,
 * so every component that needs to react to the finale (panels, header,
 * overlays) reads the same single source of truth instead of re-deriving
 * `phase`/`finaleStep` combinations itself. Also hands back the current
 * step's duration as a CSS variable so animation timing stays anchored to
 * BATTLE_TRANSITION_TIMING instead of being re-typed into stylesheets.
 */
export function useBattleTransition(): BattleTransitionInfo {
  const snap = useGameSnapshot();
  let phase: BattleTransitionPhase = "idle";
  if (snap.phase === "completed") {
    phase = "battleOpen";
  } else if (snap.phase === "finale" && snap.finaleStep !== "none") {
    phase = snap.finaleStep;
  }
  const durationMs = phase in BATTLE_TRANSITION_TIMING ? BATTLE_TRANSITION_TIMING[phase as keyof typeof BATTLE_TRANSITION_TIMING] : 0;
  return { phase, logoUrl: snap.logoUrl, style: { "--bt-dur": `${durationMs}ms` } as CSSProperties };
}
