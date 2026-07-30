import { StatsPanel } from "./StatsPanel";
import { NextPlayersPanel } from "./NextPlayersPanel";
import { KeyGuide } from "./KeyGuide";

export function RightPanel() {
  return (
    <div className="arcade-column arcade-column-right">
      <StatsPanel />
      <NextPlayersPanel />
      <KeyGuide />
    </div>
  );
}
