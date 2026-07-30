import type { ActivePiece, Board, BoardCell } from "../types/game";
import { getShapeCells } from "./tetrominoes";

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array<BoardCell | null>(BOARD_COLS).fill(null),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

/** Writes a landed piece's cells into the board at the given final row. */
export function lockPieceOnBoard(
  board: Board,
  piece: ActivePiece,
  finalRow: number,
): Board {
  const next = cloneBoard(board);
  const shape = getShapeCells(piece.type, piece.rotation);
  shape.forEach(([dx, dy], index) => {
    const col = piece.x + dx;
    const row = finalRow + dy;
    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return;
    const cellDef = piece.cells[index];
    next[row][col] = {
      filled: true,
      char: cellDef.char,
      isEmpty: cellDef.isEmpty,
      colorIndex: piece.colorIndex,
      participantName: piece.participant.name,
    };
  });
  return next;
}

export function findFullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    if (board[r].every((cell) => cell !== null)) rows.push(r);
  }
  return rows;
}

/** Removes the given rows and drops everything above down to fill the gap. */
export function removeRows(board: Board, rows: number[]): Board {
  if (rows.length === 0) return board;
  const rowSet = new Set(rows);
  const remaining = board.filter((_, r) => !rowSet.has(r));
  const emptyRows = Array.from({ length: rows.length }, () =>
    Array<BoardCell | null>(BOARD_COLS).fill(null),
  );
  return [...emptyRows, ...remaining];
}

export function columnHeights(board: Board): number[] {
  const heights = new Array(BOARD_COLS).fill(0);
  for (let c = 0; c < BOARD_COLS; c++) {
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (board[r][c] !== null) {
        heights[c] = BOARD_ROWS - r;
        break;
      }
    }
  }
  return heights;
}

export function countHoles(board: Board): number {
  let holes = 0;
  for (let c = 0; c < BOARD_COLS; c++) {
    let seenBlock = false;
    for (let r = 0; r < BOARD_ROWS; r++) {
      if (board[r][c] !== null) seenBlock = true;
      else if (seenBlock) holes += 1;
    }
  }
  return holes;
}

export function bumpiness(heights: number[]): number {
  let total = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    total += Math.abs(heights[i] - heights[i + 1]);
  }
  return total;
}

export function aggregateHeight(heights: number[]): number {
  return heights.reduce((sum, h) => sum + h, 0);
}

export function maxHeight(heights: number[]): number {
  return heights.length ? Math.max(...heights) : 0;
}

/** True if any cell in the board's top `rowCount` rows is occupied. */
export function isTopOccupied(board: Board, rowCount: number): boolean {
  for (let r = 0; r < rowCount; r++) {
    if (board[r].some((cell) => cell !== null)) return true;
  }
  return false;
}

/**
 * Forcibly detonates the most-filled bottom rows to guarantee spawn room.
 * This is the last-resort overflow guard from spec section 13: it never
 * shows a game-over state, it just clears space using the same visual
 * language as a normal line clear.
 */
export function pickForcedClearRows(board: Board, count: number): number[] {
  const fillCounts = board.map((row) => row.filter((cell) => cell !== null).length);
  const candidates = fillCounts
    .map((fill, row) => ({ row, fill }))
    .filter(({ fill }) => fill > 0 && fill < BOARD_COLS)
    .sort((a, b) => b.fill - a.fill || b.row - a.row);
  return candidates.slice(0, count).map((c) => c.row);
}
