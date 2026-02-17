// Unicode box-drawing characters (always output these)
export const BOX = {
  TL: '┌', TR: '┐', BL: '└', BR: '┘',
  H: '─', V: '│',
  T_DOWN: '┬', T_UP: '┴', T_RIGHT: '├', T_LEFT: '┤', CROSS: '┼',
} as const;

// ---------------------------------------------------------------------------
// Direction model for junction resolution
// ---------------------------------------------------------------------------

export type BoxDirs = { up: boolean; down: boolean; left: boolean; right: boolean };

const CHAR_DIRS: Record<string, BoxDirs> = {
  '─': { up: false, down: false, left: true, right: true },
  '│': { up: true, down: true, left: false, right: false },
  '┌': { up: false, down: true, left: false, right: true },
  '┐': { up: false, down: true, left: true, right: false },
  '└': { up: true, down: false, left: false, right: true },
  '┘': { up: true, down: false, left: true, right: false },
  '┬': { up: false, down: true, left: true, right: true },
  '┴': { up: true, down: false, left: true, right: true },
  '├': { up: true, down: true, left: false, right: true },
  '┤': { up: true, down: true, left: true, right: false },
  '┼': { up: true, down: true, left: true, right: true },
  '+': { up: true, down: true, left: true, right: true },
  '-': { up: false, down: false, left: true, right: true },
  '|': { up: true, down: true, left: false, right: false },
};

/** Get the direction flags for a box-drawing character, or null. */
export function getBoxDirs(ch: string): BoxDirs | null {
  return CHAR_DIRS[ch] ?? null;
}

/** True if ch is any recognised box-drawing character. */
export function isAnyBoxChar(ch: string): boolean {
  return ch in CHAR_DIRS;
}

/** Map a set of directions to the correct Unicode box-drawing char. */
export function dirsToBoxChar(dirs: BoxDirs): string {
  const { up, down, left, right } = dirs;
  if (up && down && left && right) return '┼';
  if (up && down && right && !left) return '├';
  if (up && down && left && !right) return '┤';
  if (!up && down && left && right) return '┬';
  if (up && !down && left && right) return '┴';
  if (!up && down && !left && right) return '┌';
  if (!up && down && left && !right) return '┐';
  if (up && !down && !left && right) return '└';
  if (up && !down && left && !right) return '┘';
  if (left || right) return '─';
  if (up || down) return '│';
  return ' ';
}

/**
 * Merge two overlapping box-drawing characters by unioning their directions.
 * If either character is not a box-drawing char, returns `incoming` as-is.
 */
export function mergeBoxChars(existing: string, incoming: string): string {
  const eDirs = getBoxDirs(existing);
  const iDirs = getBoxDirs(incoming);
  if (!eDirs || !iDirs) return incoming;
  return dirsToBoxChar({
    up: eDirs.up || iDirs.up,
    down: eDirs.down || iDirs.down,
    left: eDirs.left || iDirs.left,
    right: eDirs.right || iDirs.right,
  });
}

// ---------------------------------------------------------------------------
// Detection helpers (recognize both old ASCII and new Unicode)
// ---------------------------------------------------------------------------

/** Any box node / junction / corner character (used to find box boundaries). */
export function isBoxCorner(ch: string) {
  return ch === '┌' || ch === '┐' || ch === '└' || ch === '┘' ||
         ch === '├' || ch === '┤' || ch === '┬' || ch === '┴' || ch === '┼' ||
         ch === '+';
}

/** Character with horizontal connections (used for edge validation). */
export function isBoxHorizontal(ch: string) {
  const d = CHAR_DIRS[ch];
  return d != null && (d.left || d.right);
}

/** Character with vertical connections (used for edge validation). */
export function isBoxVertical(ch: string) {
  const d = CHAR_DIRS[ch];
  return d != null && (d.up || d.down);
}

export function isBoxEdge(ch: string) { return isBoxCorner(ch) || isBoxHorizontal(ch) || isBoxVertical(ch); }
