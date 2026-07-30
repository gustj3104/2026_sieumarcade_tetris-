import { useGameSnapshot } from "../state/gameStore";

export function ScoreBoard() {
  const snap = useGameSnapshot();
  const scoreStr = String(snap.score).padStart(6, "0");
  const linesStr = String(snap.linesCleared).padStart(3, "0");

  return (
    <div className="hud">
      <div className="hud-corner hud-top-left">
        <div className="hud-label">BATTLE ENTRY</div>
        <div className="hud-sub">AUTO PLAY</div>
      </div>
      <div className="hud-corner hud-top-right">
        <div className="hud-block">
          <div className="hud-label">ENTRY</div>
          <div className="hud-value">
            {snap.entryIndex} / {snap.totalParticipants || "-"}
          </div>
        </div>
        <div className="hud-block">
          <div className="hud-label">SCORE</div>
          <div className="hud-value">{scoreStr}</div>
        </div>
        <div className="hud-block">
          <div className="hud-label">LINES</div>
          <div className="hud-value">{linesStr}</div>
        </div>
      </div>
      {snap.phase === "paused" && <div className="hud-paused">PAUSED</div>}
      {snap.phase === "setup" && <div className="hud-paused">PRESS ESC FOR ADMIN</div>}
    </div>
  );
}
