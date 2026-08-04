import { useGameSnapshot } from "../state/gameStore";
import { TetrominoPreview } from "./TetrominoPreview";
import { PixelFrame } from "./PixelFrame";

const PREVIEW_CELL_PX = 22;

export function NextQueue() {
  const snap = useGameSnapshot();
  const upcoming = snap.upcoming.slice(0, 5);

  return (
    <PixelFrame className="next-queue-panel" data-bt-unit="left-frame">
      <div className="panel-title">NEXT</div>
      <div className="next-queue-list">
        {upcoming.map((participant) => (
          <div key={participant.id} className="next-queue-item" data-bt-unit="next-item">
            <TetrominoPreview participant={participant} cellPx={PREVIEW_CELL_PX} />
            <span className="next-queue-name">{participant.name}</span>
          </div>
        ))}
      </div>
    </PixelFrame>
  );
}
