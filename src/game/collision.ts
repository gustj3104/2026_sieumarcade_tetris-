import type { Board, TetrominoType } from "../types/game";
import { BOARD_COLS, BOARD_ROWS } from "./board";
import { getShapeCells } from "./tetrominoes";

/**
 * Checks whether a piece at (x, row) in the given rotation is legal: all
 * cells in bounds horizontally, not overlapping a locked cell, and not
 * below the floor. Cells above the visible board (row < 0) are allowed so
 * pieces can spawn and fall in from off-screen.
 */
export function isValidPlacement(
  board: Board,
  type: TetrominoType,
  rotation: number,
  x: number,
  row: number,
): boolean {
  const shape = getShapeCells(type, rotation);
  for (const [dx, dy] of shape) {
    const col = x + dx;
    const r = row + dy;
    if (col < 0 || col >= BOARD_COLS) return false;
    if (r >= BOARD_ROWS) return false;
    if (r >= 0 && board[r][col] !== null) return false;
  }
  return true;
}

/** Lowest legal resting row for a piece dropped straight down from startRow. */
export function computeDropRow(
  board: Board,
  type: TetrominoType,
  rotation: number,
  x: number,
  startRow: number,
): number {
  let row = startRow;
  if (!isValidPlacement(board, type, rotation, x, row)) return row;
  while (isValidPlacement(board, type, rotation, x, row + 1)) {
    row += 1;
  }
  return row;
}

/** All x columns where the shape's bounding cells stay within the board. */
export function validXRange(type: TetrominoType, rotation: number): number[] {
  const shape = getShapeCells(type, rotation);
  const minDx = Math.min(...shape.map(([dx]) => dx));
  const maxDx = Math.max(...shape.map(([dx]) => dx));
  const xs: number[] = [];
  for (let x = -minDx; x < BOARD_COLS - maxDx; x++) xs.push(x);
  return xs;
}
