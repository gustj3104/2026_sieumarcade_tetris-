import { useGameSnapshot } from "../state/gameStore";
import { TetrominoPreview } from "./TetrominoPreview";
import { PixelFrame } from "./PixelFrame";

const PREVIEW_CELL_PX = 12;

export function NextPlayersPanel() {
  const snap = useGameSnapshot();
  const upcoming = snap.upcoming.slice(0, 5);

  return (
    <PixelFrame className="next-players-panel" data-bt-unit="right-frame">
      <div className="panel-title">NEXT PLAYERS</div>
      <div className="next-players-list">
        {upcoming.map((participant, index) => (
          <div key={participant.id} className="next-players-item" data-bt-unit="next-players-row">
            <span className="next-players-index">{index + 1}</span>
            <span className="next-players-name">{participant.name}</span>
            <TetrominoPreview participant={participant} cellPx={PREVIEW_CELL_PX} />
          </div>
        ))}
      </div>
    </PixelFrame>
  );
}
