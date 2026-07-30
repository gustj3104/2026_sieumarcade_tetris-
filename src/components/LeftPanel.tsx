import { PixelFrame } from "./PixelFrame";
import { NextQueue } from "./NextQueue";
import { CurrentPlayerPanel } from "./CurrentPlayerPanel";

export function LeftPanel() {
  return (
    <div className="arcade-column arcade-column-left">
      <PixelFrame className="battle-entry-panel">
        <div className="battle-entry-title">BATTLE ENTRY</div>
        <div className="battle-entry-sub">AUTO PLAY</div>
      </PixelFrame>
      <NextQueue />
      <CurrentPlayerPanel />
    </div>
  );
}
