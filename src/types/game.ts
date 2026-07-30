export type TetrominoType = "I" | "O" | "T" | "L" | "J" | "S" | "Z";

export const ALL_TETROMINO_TYPES: TetrominoType[] = [
  "I",
  "O",
  "T",
  "L",
  "J",
  "S",
  "Z",
];

export interface Participant {
  id: string;
  /** Original, untouched name as entered by the admin. */
  name: string;
  /** Name used to fill cells (whitespace stripped, optionally abbreviated). */
  cellSource: string;
}

/** A single cell's fixed content, independent of rotation. */
export interface PieceCellDef {
  char: string;
  isEmpty: boolean;
}

export interface ActivePiece {
  id: string;
  type: TetrominoType;
  rotation: number; // 0-3, current *logical* rotation
  x: number; // logical board column of the piece origin (0..3 bounding box)
  colorIndex: number;
  participant: Participant;
  /** Fixed per-cell character assignment; index-stable across rotations. */
  cells: PieceCellDef[];

  // --- animation bookkeeping (logical target only; visuals derived in renderer) ---
  spawnedAt: number;
  startY: number;
  targetY: number;
  startX: number;
  targetX: number;
  startRotation: number;
  targetRotation: number;
  durationMs: number;
  landedAt: number | null;
}

export interface BoardCell {
  filled: boolean;
  char: string;
  isEmpty: boolean;
  colorIndex: number;
  participantName?: string;
}

export type Board = (BoardCell | null)[][];

export type GamePhase =
  | "setup"
  | "playing"
  | "paused"
  | "clearing"
  | "finale"
  | "completed";

export interface LineClearEvent {
  rows: number[];
  at: number;
  scoreGained: number;
}

export interface LandingEvent {
  participant: Participant;
  at: number;
  row: number;
  col: number;
}

export interface GameSettings {
  dropRowsPerSecond: number;
  spawnIntervalMs: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  board: Board;
  activePiece: ActivePiece | null;
  score: number;
  lines: number;
  entryIndex: number; // 1-based index of current participant within round
  totalParticipants: number;
  round: number;
  blocksSpawned: number;
  linesCleared: number;
  lastLanding: LandingEvent | null;
  lastLineClear: LineClearEvent | null;
  settings: GameSettings;
  logoUrl: string | null;
  finaleStep: FinaleStep;
  finaleStepStartedAt: number;
  comboCount: number;
  clearingRows: number[];
  clearingStartedAt: number | null;
}

export type FinaleStep =
  | "none"
  | "dim"
  | "outline"
  | "title"
  | "flash"
  | "explode"
  | "gather"
  | "logo";
