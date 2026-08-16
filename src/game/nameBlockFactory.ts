import { ALL_TETROMINO_TYPES } from "../types/game";
import type { Participant, PieceCellDef, TetrominoType } from "../types/game";
import { TETROMINO_COLORS, getShapeCells } from "./tetrominoes";
import type { ActivePiece } from "../types/game";

/**
 * Splits a participant's name into the 4 cell strings of a tetromino - one
 * character per cell, always. Names up to 4 characters fill one cell each
 * with the rest left blank; longer names only show their first 4
 * characters here (the full name still displays elsewhere - see
 * ABBREVIATE_THRESHOLD in utils/nameParser.ts).
 */
export function splitNameIntoCells(cellSource: string): string[] {
  const clean = cellSource.replace(/\s+/g, "");
  const chars = clean.slice(0, 4).split("");
  while (chars.length < 4) chars.push("");
  return chars;
}

export function buildPieceCells(participant: Participant): PieceCellDef[] {
  const chars = splitNameIntoCells(participant.cellSource);
  return chars.map((char) => ({ char, isEmpty: char.length === 0 }));
}

let pieceCounter = 0;

/** Creates a fresh, unlanded ActivePiece for a participant + assigned shape. */
export function createNameBlock(
  participant: Participant,
  type: TetrominoType,
  spawnX: number,
  now: number,
): ActivePiece {
  pieceCounter += 1;
  return {
    id: `piece-${pieceCounter}`,
    type,
    rotation: 0,
    x: spawnX,
    colorIndex: TETROMINO_COLORS[type],
    participant,
    cells: buildPieceCells(participant),
    spawnedAt: now,
    startY: -SHAPE_SPAWN_OFFSET,
    targetY: -SHAPE_SPAWN_OFFSET,
    startX: spawnX,
    targetX: spawnX,
    startRotation: 0,
    targetRotation: 0,
    durationMs: 800,
    landedAt: null,
  };
}

const SHAPE_SPAWN_OFFSET = 2;

/**
 * Deterministic shape assignment used only for the NEXT / NEXT PLAYERS
 * preview panels (an upcoming participant's actual in-game shape depends on
 * the live 7-bag + safe-placement fallback at the moment it spawns, which
 * can't be known ahead of time without simulating the whole board). Hashing
 * the participant id keeps a given participant's preview stable across
 * re-renders instead of flickering between shapes every frame.
 */
export function previewShapeForParticipant(participant: Participant): {
  type: TetrominoType;
  colorIndex: number;
  cells: PieceCellDef[];
} {
  let hash = 0;
  for (let i = 0; i < participant.id.length; i++) {
    hash = (hash * 31 + participant.id.charCodeAt(i)) >>> 0;
  }
  const type = ALL_TETROMINO_TYPES[hash % ALL_TETROMINO_TYPES.length];
  return {
    type,
    colorIndex: TETROMINO_COLORS[type],
    cells: buildPieceCells(participant),
  };
}

export function pieceCellPositions(
  piece: Pick<ActivePiece, "type" | "rotation" | "x"> & { y: number },
): { col: number; row: number; index: number }[] {
  const shape = getShapeCells(piece.type, piece.rotation);
  return shape.map(([dx, dy], index) => ({
    col: piece.x + dx,
    row: Math.round(piece.y) + dy,
    index,
  }));
}
