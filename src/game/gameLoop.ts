import type {
  ActivePiece,
  Board,
  FinaleStep,
  GamePhase,
  GameSettings,
  GameSnapshot,
  LandingEvent,
  LineClearEvent,
  Participant,
  TetrominoType,
} from "../types/game";
import {
  BOARD_COLS,
  cloneBoard,
  createEmptyBoard,
  findFullRows,
  isTopOccupied,
  lockPieceOnBoard,
  pickForcedClearRows,
  removeRows,
} from "./board";
import { chooseBestPlacement, hasSafePlacement } from "./autoPlacement";
import { createBagGenerator, SHAPE_BOX } from "./tetrominoes";
import { createNameBlock } from "./nameBlockFactory";
import { lineClearScore, SCORE_LOCK } from "./scoring";
import { shuffle } from "../utils/shuffle";
import { BATTLE_OPEN_TIMING, BATTLE_TRANSITION_ORDER } from "../effects/battleTransition/transitionTimeline";

export const CLEAR_ANIMATION_MS = 400;
const MAX_FRAME_DT_MS = 100; // guards against huge jumps after a backgrounded tab

/**
 * The finale timeline (board settles -> ALL PLAYERS READY -> energy charge
 * -> READY? -> full-screen burst -> key visual assembly -> BATTLE STARTS
 * NOW) reuses the single BATTLE_OPEN_TIMING config so the particle field,
 * CSS, and engine never drift apart. Once the sequence finishes, `phase`
 * becomes "completed" and `finaleStep` stays pinned on the last entry
 * ("battleTextReveal") forever - the renderer/overlay treat that as the
 * persistent "battle open" hold screen.
 */
export const FINALE_ORDER: FinaleStep[] = BATTLE_TRANSITION_ORDER;

export const FINALE_DURATIONS: Record<Exclude<FinaleStep, "none">, number> = BATTLE_OPEN_TIMING;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeFallDuration(startY: number, targetY: number, rowsPerSecond: number): number {
  const rows = Math.max(targetY - startY, 1);
  const ms = (rows / Math.max(rowsPerSecond, 0.5)) * 1000;
  return clamp(ms, 450, 4000);
}

export interface PieceVisualState {
  x: number;
  y: number;
  rotation: number;
  progress: number;
}

const ROTATION_SWITCH_T = 0.55;
const X_MOVE_START_T = 0.12;
const X_MOVE_END_T = 0.55;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Derives a piece's current visual x/y/rotation from elapsed time alone (no stored velocity). */
export function getPieceVisualState(piece: ActivePiece, clock: number): PieceVisualState {
  const t = clamp((clock - piece.spawnedAt) / piece.durationMs, 0, 1);
  const fallT = Math.pow(t, 1.6);
  const y = piece.startY + (piece.targetY - piece.startY) * fallT;
  const xT = clamp((t - X_MOVE_START_T) / (X_MOVE_END_T - X_MOVE_START_T), 0, 1);
  const x = piece.startX + (piece.targetX - piece.startX) * easeOutCubic(xT);
  const rotation = t < ROTATION_SWITCH_T ? piece.startRotation : piece.targetRotation;
  return { x, y, rotation, progress: t };
}

interface PendingClear {
  rows: number[];
  startedAt: number;
  scoreGained: number;
}

/**
 * Owns the entire show: board state, the auto-playing current piece, line
 * clears, the participant roster/round-repeat logic, and the finale
 * timeline. Framework-agnostic; React (state/gameStore.ts) and the canvas
 * renderer both read it via getSnapshot()/getClock() and subscribe() to
 * discrete change notifications.
 */
export class TetrisEngine {
  private board: Board = createEmptyBoard();
  private phase: GamePhase = "setup";
  private originalParticipants: Participant[] = [];
  private playQueue: Participant[] = [];
  private round = 1;
  private entryIndex = 0;
  private blocksSpawned = 0;
  private linesCleared = 0;
  private score = 0;
  private comboCount = 0;

  private bagNext = createBagGenerator();
  private pendingTypeOverrides: TetrominoType[] = [];

  private currentPiece: ActivePiece | null = null;
  private pendingClear: PendingClear | null = null;
  private nextSpawnAt = 0;

  private finaleRequested = false;
  private finaleStep: FinaleStep = "none";
  private finaleStepStartedAt = 0;
  private finaleBoardSnapshot: Board | null = null;

  private lastLanding: LandingEvent | null = null;
  private lastLineClear: LineClearEvent | null = null;

  private settings: GameSettings = {
    dropRowsPerSecond: 4,
    spawnIntervalMs: 450,
  };

  private logoUrl: string | null = null;
  private clock = 0;

  private listeners = new Set<() => void>();
  private snapshot: GameSnapshot;

  constructor() {
    this.snapshot = this.buildSnapshot();
  }

  // ---- external API -------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  getClock(): number {
    return this.clock;
  }

  loadParticipants(participants: Participant[]): void {
    this.originalParticipants = participants;
    this.playQueue = shuffle(participants);
    this.notify();
  }

  start(): void {
    if (this.originalParticipants.length === 0) return;
    if (this.phase === "setup" || this.phase === "completed") {
      this.board = createEmptyBoard();
      this.score = 0;
      this.linesCleared = 0;
      this.blocksSpawned = 0;
      this.round = 1;
      this.entryIndex = 0;
      this.comboCount = 0;
      this.finaleRequested = false;
      this.finaleStep = "none";
      this.finaleBoardSnapshot = null;
      this.pendingTypeOverrides = [];
      this.currentPiece = null;
      this.pendingClear = null;
      this.playQueue = shuffle(this.originalParticipants);
    }
    this.phase = "playing";
    this.nextSpawnAt = this.clock;
    this.notify();
  }

  pause(): void {
    if (this.phase === "playing" || this.phase === "clearing") {
      this.pausedFrom = this.phase;
      this.phase = "paused";
      this.notify();
    }
  }

  resume(): void {
    if (this.phase === "paused") {
      this.phase = this.pausedFrom ?? "playing";
      this.notify();
    }
  }

  private pausedFrom: GamePhase | null = null;

  togglePause(): void {
    if (this.phase === "paused") this.resume();
    else this.pause();
  }

  reset(): void {
    this.start();
  }

  /** Force-lands the current piece immediately (admin "N" shortcut). */
  instantDrop(): void {
    if (this.phase !== "playing" || !this.currentPiece) return;
    this.lockCurrentPiece();
  }

  setDropSpeed(rowsPerSecond: number): void {
    this.settings = { ...this.settings, dropRowsPerSecond: clamp(rowsPerSecond, 1, 12) };
    this.notify();
  }

  setSpawnInterval(ms: number): void {
    this.settings = { ...this.settings, spawnIntervalMs: clamp(ms, 50, 2000) };
    this.notify();
  }

  setLogo(url: string | null): void {
    this.logoUrl = url;
    this.notify();
  }

  /** Admin end-of-event trigger: stop new spawns and run the finale sequence. */
  triggerFinale(): void {
    if (this.phase === "setup" || this.phase === "finale" || this.phase === "completed") return;
    this.finaleRequested = true;
    if (this.phase === "paused") this.phase = this.pausedFrom ?? "playing";
    if (this.phase === "playing" && this.currentPiece) {
      this.lockCurrentPiece();
    }
    this.notify();
  }

  /** Advances the simulation by dtMs of wall-clock time. Call once per animation frame. */
  tick(dtMs: number): void {
    if (this.phase === "paused" || this.phase === "setup") return;
    const dt = Math.min(Math.max(dtMs, 0), MAX_FRAME_DT_MS);
    this.clock += dt;

    if (this.phase === "playing") this.tickPlaying();
    else if (this.phase === "clearing") this.tickClearing();
    else if (this.phase === "finale") this.tickFinale();
  }

  // ---- internal simulation -------------------------------------------

  private tickPlaying(): void {
    if (this.currentPiece) {
      const p = this.currentPiece;
      const t = (this.clock - p.spawnedAt) / p.durationMs;
      if (t >= 1) this.lockCurrentPiece();
      return;
    }
    if (this.finaleRequested) {
      this.beginFinale();
      return;
    }
    if (this.clock >= this.nextSpawnAt) this.trySpawnNext();
  }

  private lockCurrentPiece(): void {
    const piece = this.currentPiece;
    if (!piece) return;
    // The visual animation eases toward targetX/targetRotation, but the
    // logical x/rotation fields (what lockPieceOnBoard reads) are only
    // ever set at spawn time. Snap them to the chosen placement now so the
    // piece welds into the board where it visually landed.
    piece.x = piece.targetX;
    piece.rotation = piece.targetRotation;
    this.board = lockPieceOnBoard(this.board, piece, piece.targetY);
    this.score += SCORE_LOCK;
    this.lastLanding = {
      participant: piece.participant,
      at: this.clock,
      row: piece.targetY,
      col: piece.targetX,
    };
    this.currentPiece = null;

    const rows = findFullRows(this.board);
    if (rows.length > 0) {
      const scoreGained = lineClearScore(rows.length, this.comboCount);
      this.comboCount += 1;
      this.phase = "clearing";
      this.pendingClear = { rows, startedAt: this.clock, scoreGained };
    } else {
      this.comboCount = 0;
      this.nextSpawnAt = this.clock + this.settings.spawnIntervalMs;
    }
    this.notify();
  }

  private tickClearing(): void {
    const pc = this.pendingClear;
    if (!pc) return;
    if (this.clock - pc.startedAt >= CLEAR_ANIMATION_MS) {
      this.board = removeRows(this.board, pc.rows);
      this.score += pc.scoreGained;
      this.linesCleared += pc.rows.length;
      this.lastLineClear = { rows: pc.rows, at: this.clock, scoreGained: pc.scoreGained };
      this.pendingClear = null;
      this.phase = "playing";
      this.nextSpawnAt = this.clock + this.settings.spawnIntervalMs;
      this.notify();
    }
  }

  private trySpawnNext(): void {
    if (isTopOccupied(this.board, 2)) {
      const rows = pickForcedClearRows(this.board, 2);
      if (rows.length > 0) {
        this.phase = "clearing";
        this.pendingClear = { rows, startedAt: this.clock, scoreGained: 0 };
        this.notify();
        return;
      }
    }

    const type = this.pickSafeType();
    const participant = this.nextParticipant();
    const spawnX = Math.floor((BOARD_COLS - SHAPE_BOX) / 2);
    const placement = chooseBestPlacement(this.board, type);

    const piece = createNameBlock(participant, type, spawnX, this.clock);
    piece.startX = spawnX;
    piece.x = spawnX;
    piece.targetX = placement.x;
    piece.startRotation = 0;
    piece.rotation = 0;
    piece.targetRotation = placement.rotation;
    piece.startY = -2;
    piece.targetY = placement.row;
    piece.durationMs = computeFallDuration(piece.startY, piece.targetY, this.settings.dropRowsPerSecond);

    this.currentPiece = piece;
    this.blocksSpawned += 1;
    this.notify();
  }

  private nextParticipant(): Participant {
    if (this.playQueue.length === 0) {
      this.playQueue = shuffle(this.originalParticipants);
      this.round += 1;
      this.entryIndex = 0;
    }
    this.entryIndex += 1;
    return this.playQueue.shift() as Participant;
  }

  /**
   * Non-mutating preview of the next `count` participants for the NEXT
   * panels. Reads straight off the live queue; once the queue runs dry it
   * pads with the roster in original order (an approximation of the round
   * that hasn't been shuffled yet, since that shuffle only happens lazily).
   */
  private peekUpcoming(count: number): Participant[] {
    const result: Participant[] = [];
    if (this.originalParticipants.length === 0) return result;
    let i = 0;
    while (result.length < count) {
      if (i < this.playQueue.length) {
        result.push(this.playQueue[i]);
      } else {
        const idx = (i - this.playQueue.length) % this.originalParticipants.length;
        result.push(this.originalParticipants[idx]);
      }
      i += 1;
    }
    return result;
  }

  private drawType(): TetrominoType {
    if (this.pendingTypeOverrides.length > 0) {
      return this.pendingTypeOverrides.shift() as TetrominoType;
    }
    return this.bagNext();
  }

  /** Looks ahead a few pieces for one with a safe (non-topping-out) landing spot. */
  private pickSafeType(): TetrominoType {
    const first = this.drawType();
    if (hasSafePlacement(this.board, first)) return first;
    const skipped = [first];
    for (let i = 0; i < 6; i++) {
      const candidate = this.drawType();
      if (hasSafePlacement(this.board, candidate)) {
        this.pendingTypeOverrides.push(...skipped);
        return candidate;
      }
      skipped.push(candidate);
    }
    this.pendingTypeOverrides.push(...skipped.slice(1));
    return skipped[0];
  }

  private beginFinale(): void {
    this.phase = "finale";
    this.finaleStep = FINALE_ORDER[0];
    this.finaleStepStartedAt = this.clock;
    this.finaleBoardSnapshot = cloneBoard(this.board);
    this.notify();
  }

  private tickFinale(): void {
    const idx = FINALE_ORDER.indexOf(this.finaleStep);
    if (idx === -1) return;
    const dur = FINALE_DURATIONS[this.finaleStep as keyof typeof FINALE_DURATIONS];
    if (this.clock - this.finaleStepStartedAt >= dur) {
      if (idx < FINALE_ORDER.length - 1) {
        this.finaleStep = FINALE_ORDER[idx + 1];
        this.finaleStepStartedAt = this.clock;
      } else {
        this.phase = "completed";
      }
      this.notify();
    }
  }

  // ---- snapshot plumbing ----------------------------------------------

  private notify(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      board: this.phase === "finale" || this.phase === "completed"
        ? (this.finaleBoardSnapshot ?? this.board)
        : this.board,
      activePiece: this.currentPiece,
      score: this.score,
      lines: this.linesCleared,
      entryIndex: this.entryIndex,
      totalParticipants: this.originalParticipants.length,
      round: this.round,
      blocksSpawned: this.blocksSpawned,
      linesCleared: this.linesCleared,
      level: Math.floor(this.linesCleared / 10) + 1,
      upcoming: this.peekUpcoming(5),
      lastLanding: this.lastLanding,
      lastLineClear: this.lastLineClear,
      settings: this.settings,
      logoUrl: this.logoUrl,
      finaleStep: this.finaleStep,
      finaleStepStartedAt: this.finaleStepStartedAt,
      comboCount: this.comboCount,
      clearingRows: this.pendingClear?.rows ?? [],
      clearingStartedAt: this.pendingClear?.startedAt ?? null,
    };
  }
}
