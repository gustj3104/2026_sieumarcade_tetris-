import type { Board } from "../types/game";
import { findFullRows, removeRows } from "./board";

export interface LineClearResult {
  rows: number[];
  board: Board;
}

/** Pure detect-and-remove step; visual timing/particles are the caller's job. */
export function resolveLineClears(board: Board): LineClearResult {
  const rows = findFullRows(board);
  if (rows.length === 0) return { rows: [], board };
  return { rows, board: removeRows(board, rows) };
}
