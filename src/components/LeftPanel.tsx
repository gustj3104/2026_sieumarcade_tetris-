import { PixelFrame } from "./PixelFrame";
import { NextQueue } from "./NextQueue";
import { CurrentPlayerPanel } from "./CurrentPlayerPanel";
import { useBattleTransition } from "../hooks/useBattleTransition";

export function LeftPanel() {
  const { phase, style } = useBattleTransition();
  return (
    <div className={`arcade-column arcade-column-left bt-side-panel bt-side-${phase}`} style={style}>
      <PixelFrame className="battle-entry-panel" data-bt-unit="left-frame">
        <div className="battle-entry-title" data-bt-unit="battle-entry">BATTLE ENTRY</div>
        <div className="battle-entry-sub" data-bt-unit="battle-entry">AUTO PLAY</div>
      </PixelFrame>
      <NextQueue />
      <CurrentPlayerPanel />
    </div>
  );
}
