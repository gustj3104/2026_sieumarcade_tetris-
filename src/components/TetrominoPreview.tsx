import { getShapeCells } from "../game/tetrominoes";
import { previewShapeForParticipant } from "../game/nameBlockFactory";
import { TETROMINO_PALETTE } from "../rendering/blockRenderer";
import type { Participant } from "../types/game";

interface TetrominoPreviewProps {
  participant: Participant;
  cellPx: number;
}

/**
 * Renders a participant's name as an actual tetromino-shaped block preview
 * (not a text list): every one of the piece's 4 cells is a solid, bordered
 * pixel block, including cells with no character - a name shorter than 4
 * chars still fills the whole shape with opaque color, per spec.
 */
export function TetrominoPreview({ participant, cellPx }: TetrominoPreviewProps) {
  const { type, colorIndex, cells } = previewShapeForParticipant(participant);
  const shape = getShapeCells(type, 0);
  const palette = TETROMINO_PALETTE[colorIndex];

  const minDx = Math.min(...shape.map(([dx]) => dx));
  const maxDx = Math.max(...shape.map(([dx]) => dx));
  const minDy = Math.min(...shape.map(([, dy]) => dy));
  const maxDy = Math.max(...shape.map(([, dy]) => dy));
  const cols = maxDx - minDx + 1;
  const rows = maxDy - minDy + 1;

  return (
    <div
      className="tetromino-preview"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
      }}
    >
      {shape.map(([dx, dy], index) => {
        const cellDef = cells[index];
        return (
          <div
            key={index}
            className="tetromino-preview-cell"
            style={{
              gridColumnStart: dx - minDx + 1,
              gridRowStart: dy - minDy + 1,
              width: cellPx,
              height: cellPx,
              backgroundColor: palette.base,
              fontSize: cellDef.char.length > 1 ? cellPx * 0.34 : cellPx * 0.5,
            }}
          >
            {!cellDef.isEmpty ? cellDef.char : ""}
          </div>
        );
      })}
    </div>
  );
}
