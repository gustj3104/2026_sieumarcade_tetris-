import type { Participant } from "../types/game";

export const MAX_PARTICIPANTS = 150;

export interface ParseResult {
  participants: Participant[];
  duplicates: string[];
  truncated: boolean;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `p-${idCounter}-${Date.now().toString(36)}`;
}

/**
 * A tetromino has 4 cells and each cell shows exactly one character, so
 * only a name's first 4 characters ever reach the board. The full original
 * name is always kept on the participant record for the PLAYER panel /
 * landing-highlight display, which isn't cell-limited.
 */
const ABBREVIATE_THRESHOLD = 4;

function buildCellSource(name: string): string {
  const clean = name.replace(/\s+/g, "");
  if (clean.length <= ABBREVIATE_THRESHOLD) return clean;
  return clean.slice(0, ABBREVIATE_THRESHOLD);
}

/**
 * Parses raw admin textarea input (one name per line) into the participant
 * roster used for playback. Trims whitespace, drops empty lines, flags
 * duplicates (case-insensitive) without removing them, and caps the roster
 * at MAX_PARTICIPANTS.
 */
export function parseParticipants(raw: string): ParseResult {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const seen = new Map<string, number>();
  for (const line of lines) {
    const key = line.toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);

  const truncated = lines.length > MAX_PARTICIPANTS;
  const finalLines = lines.slice(0, MAX_PARTICIPANTS);

  const participants: Participant[] = finalLines.map((name) => ({
    id: nextId(),
    name,
    cellSource: buildCellSource(name),
  }));

  return { participants, duplicates, truncated };
}
