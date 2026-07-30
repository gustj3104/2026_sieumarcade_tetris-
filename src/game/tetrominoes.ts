import { ALL_TETROMINO_TYPES, type TetrominoType } from "../types/game";
import { shuffle } from "../utils/shuffle";

/** Bounding-box size every shape and rotation is defined within. */
export const SHAPE_BOX = 4;

type Cell = [number, number]; // [col, row] within the SHAPE_BOX x SHAPE_BOX box

/**
 * Rotation-0 cell coordinates for each piece, already listed in row-major
 * reading order (top-to-bottom, left-to-right). This ordering is what a
 * participant's name characters get assigned to, index by index, so that
 * "윤현지" reads naturally across the shape.
 */
const BASE_SHAPES: Record<TetrominoType, Cell[]> = {
  I: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  O: [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ],
  T: [
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ],
  S: [
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
  ],
  Z: [
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 2],
  ],
  J: [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  L: [
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
};

function rotateCW(cells: Cell[]): Cell[] {
  // (x, y) -> (N-1-y, x) rotates a point 90 degrees clockwise within an
  // N x N box. Applying it positionally (not re-sorting) is what keeps
  // cell index `i` referring to the same physical/character cell across
  // every rotation state.
  return cells.map(([x, y]) => [SHAPE_BOX - 1 - y, x]);
}

function buildRotations(base: Cell[]): Cell[][] {
  const r0 = [...base].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const r1 = rotateCW(r0);
  const r2 = rotateCW(r1);
  const r3 = rotateCW(r2);
  return [r0, r1, r2, r3];
}

/** cells[type][rotation] -> 4 [col,row] offsets, index-stable across rotations. */
export const TETROMINO_SHAPES: Record<TetrominoType, Cell[][]> = Object.fromEntries(
  ALL_TETROMINO_TYPES.map((type) => [type, buildRotations(BASE_SHAPES[type])]),
) as Record<TetrominoType, Cell[][]>;

export const TETROMINO_COLORS: Record<TetrominoType, number> = {
  I: 0,
  O: 1,
  T: 2,
  L: 3,
  J: 4,
  S: 5,
  Z: 6,
};

export function getShapeCells(type: TetrominoType, rotation: number): Cell[] {
  return TETROMINO_SHAPES[type][((rotation % 4) + 4) % 4];
}

/**
 * Classic 7-bag randomizer: every tetromino type appears exactly once per
 * bag, in a shuffled order, before a new bag is drawn. Prevents long
 * droughts/streaks of the same shape.
 */
export function createBagGenerator() {
  let bag: TetrominoType[] = [];
  return function next(): TetrominoType {
    if (bag.length === 0) {
      bag = shuffle(ALL_TETROMINO_TYPES);
    }
    return bag.pop() as TetrominoType;
  };
}
