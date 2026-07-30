import { useGameSnapshot } from "../state/gameStore";
import { PixelFrame } from "./PixelFrame";

export function StatsPanel() {
  const snap = useGameSnapshot();
  const scoreStr = String(snap.score).padStart(6, "0");
  const linesStr = String(snap.linesCleared).padStart(3, "0");
  const comboStr = String(snap.comboCount).padStart(2, "0");
  const levelStr = String(snap.level).padStart(2, "0");

  return (
    <PixelFrame className="stats-panel">
      <div className="panel-title">STATS</div>
      <div className="panel-body">
        <div className="stats-row">
          <span className="stats-label">ENTRY</span>
          <span className="stats-value">
            {snap.entryIndex} / {snap.totalParticipants || "-"}
          </span>
        </div>
        <div className="stats-row">
          <span className="stats-label">SCORE</span>
          <span className="stats-value">{scoreStr}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">LINES</span>
          <span className="stats-value">{linesStr}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">COMBO</span>
          <span className="stats-value">{comboStr}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">LEVEL</span>
          <span className="stats-value">{levelStr}</span>
        </div>
      </div>
    </PixelFrame>
  );
}
