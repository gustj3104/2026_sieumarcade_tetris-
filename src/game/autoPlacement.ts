import type { Board, TetrominoType } from "../types/game";
import {
  aggregateHeight,
  bumpiness,
  columnHeights,
  countHoles,
  findFullRows,
  lockPieceOnBoard,
  maxHeight,
} from "./board";
import { computeDropRow, isValidPlacement, validXRange } from "./collision";
import { getShapeCells } from "./tetrominoes";

export interface PlacementCandidate {
  rotation: number;
  x: number;
  row: number;
  topRow: number;
  score: number;
  linesCleared: number;
}

// Weights loosely follow the well-known "El-Tetris" style heuristic: reward
// line clears and a low, flat board; punish holes and tall spikes.
const WEIGHTS = {
  linesCleared: 0.76,
  aggregateHeight: -0.51,
  holes: -0.36,
  bumpiness: -0.18,
  maxHeight: -0.4,
};

const CRITICAL_ROW = 4; // spawn safety margin from the very top

function scorePlacement(board: Board, type: TetrominoType, rotation: number, x: number): PlacementCandidate | null {
  const dropRow = computeDropRow(board, type, rotation, x, -4);
  if (!isValidPlacement(board, type, rotation, x, dropRow)) return null;
  // Reject placements that would leave any cell above the visible board.
  const shape = getShapeCells(type, rotation);
  const minRow = Math.min(...shape.map(([, dy]) => dropRow + dy));
  if (minRow < 0) return null;

  const fakePiece = {
    type,
    rotation,
    x,
    colorIndex: 0,
    participant: { id: "sim", name: "", cellSource: "" },
    cells: [
      { char: "", isEmpty: true },
      { char: "", isEmpty: true },
      { char: "", isEmpty: true },
      { char: "", isEmpty: true },
    ],
  } as Parameters<typeof lockPieceOnBoard>[1];

  const locked = lockPieceOnBoard(board, fakePiece, dropRow);
  const linesCleared = findFullRows(locked).length;
  const heights = columnHeights(locked);
  const holes = countHoles(locked);
  const bump = bumpiness(heights);
  const agg = aggregateHeight(heights);
  const top = maxHeight(heights);

  const score =
    WEIGHTS.linesCleared * linesCleared +
    WEIGHTS.aggregateHeight * agg +
    WEIGHTS.holes * holes +
    WEIGHTS.bumpiness * bump +
    WEIGHTS.maxHeight * top;

  return { rotation, x, row: dropRow, topRow: minRow, score, linesCleared };
}

function allCandidates(board: Board, type: TetrominoType): PlacementCandidate[] {
  const candidates: PlacementCandidate[] = [];
  for (let rotation = 0; rotation < 4; rotation++) {
    for (const x of validXRange(type, rotation)) {
      const candidate = scorePlacement(board, type, rotation, x);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates;
}

/** True if the piece has at least one landing spot that stays clear of the critical top rows. */
export function hasSafePlacement(board: Board, type: TetrominoType): boolean {
  return allCandidates(board, type).some((c) => c.topRow >= CRITICAL_ROW);
}

/**
 * Chooses where the current piece should land. Evaluates every
 * rotation x column combination, keeps the near-best scoring candidates,
 * and randomly picks among them so the autoplay doesn't look robotically
 * perfect every time.
 */
export function chooseBestPlacement(board: Board, type: TetrominoType): PlacementCandidate {
  const candidates = allCandidates(board, type);
  if (candidates.length === 0) {
    // Should not happen in practice (board overflow guard runs before spawn),
    // but fall back to a safe top-left placement to avoid crashing.
    return { rotation: 0, x: 3, row: 0, topRow: 0, score: -Infinity, linesCleared: 0 };
  }
  const best = Math.max(...candidates.map((c) => c.score));
  const epsilon = 0.75;
  const nearBest = candidates.filter((c) => best - c.score <= epsilon);
  return nearBest[Math.floor(Math.random() * nearBest.length)];
}
