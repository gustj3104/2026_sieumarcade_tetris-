import { StatsPanel } from "./StatsPanel";
import { NextPlayersPanel } from "./NextPlayersPanel";
import { KeyGuide } from "./KeyGuide";
import { useBattleTransition } from "../hooks/useBattleTransition";

export function RightPanel() {
  const { phase, style } = useBattleTransition();
  return (
    <div className={`arcade-column arcade-column-right bt-side-panel bt-side-${phase}`} style={style}>
      <StatsPanel />
      <NextPlayersPanel />
      <KeyGuide />
    </div>
  );
}
