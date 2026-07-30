import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { BattleHeader } from "./BattleHeader";
import { GameBoard } from "./GameBoard";
import { FinaleOverlay } from "./FinaleOverlay";

/**
 * The full audience-facing cabinet: left info panel, center title + board,
 * right stats panel. Never renders admin controls (see AdminPanel, toggled
 * separately by App via Esc).
 */
export function ArcadeShell() {
  return (
    <div className="arcade-shell">
      <LeftPanel />
      <div className="arcade-column arcade-column-center">
        <BattleHeader />
        <GameBoard />
      </div>
      <RightPanel />
      <FinaleOverlay />
    </div>
  );
}
