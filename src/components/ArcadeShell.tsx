import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { BattleHeader } from "./BattleHeader";
import { GameBoard } from "./GameBoard";
import { FinaleOverlay } from "./FinaleOverlay";
import { BattleTransitionOverlay } from "./BattleTransition/BattleTransitionOverlay";
import { useBattleTransition } from "../hooks/useBattleTransition";

/**
 * The full audience-facing cabinet: left info panel, center title + board,
 * right stats panel. Never renders admin controls (see AdminPanel, toggled
 * separately by App via Esc). The `bt-cabinet-*` class carries the
 * whole-screen shake (playersReady/charging) and the post-burst disappearance
 * of the real board+panels+header (burst onward - the particle field and
 * key-visual stage in BattleTransitionOverlay take over from there).
 *
 * BattleTransitionOverlay is deliberately a sibling of `.arcade-shell`, not
 * a child: the shake animates `.arcade-shell`'s transform, and a
 * `position: fixed` descendant of a transformed ancestor stops being fixed
 * to the viewport - it would shake and mis-size along with the cabinet
 * instead of covering the true full screen.
 */
export function ArcadeShell() {
  const { phase, style } = useBattleTransition();
  return (
    <>
      <div className={`arcade-shell bt-cabinet bt-cabinet-${phase}`} style={style}>
        <LeftPanel />
        <div className="arcade-column arcade-column-center">
          <BattleHeader />
          <GameBoard />
        </div>
        <RightPanel />
      </div>
      <FinaleOverlay />
      <BattleTransitionOverlay />
    </>
  );
}
