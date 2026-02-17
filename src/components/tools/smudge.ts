import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';

const DENSITY_CHARS = [' ', '\u2591', '\u2592', '\u2593', '\u2588'];
const DENSITY: Record<string, number> = { ' ': 0, '\u2591': 1, '\u2592': 2, '\u2593': 3, '\u2588': 4 };
const DECAY_INTERVAL = 3;

let carriedChar = ' ';
let distanceSincePickup = 0;

function decayChar(char: string, distance: number): string {
  const base = DENSITY[char] ?? 0;
  const decay = Math.floor(distance / DECAY_INTERVAL);
  const level = Math.max(0, base - decay);
  return DENSITY_CHARS[level];
}

function interpolate(r0: number, c0: number, r1: number, c1: number): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dc - dr;
  let r = r0;
  let c = c0;

  while (true) {
    cells.push({ row: r, col: c });
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc) { err += dc; r += sr; }
  }

  return cells;
}

export const smudgeTool: DrawingTool = {
  id: 'smudge',
  label: 'Smudge',
  icon: 'Droplets',
  continuous: true,

  onDragStart(pos: GridPos, grid: CharGrid): PreviewCell[] | null {
    const ch = grid.getChar(pos.row, pos.col);
    carriedChar = ch !== ' ' ? ch : '\u2588';
    distanceSincePickup = 0;
    return null;
  },

  onContinuousDrag(prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const path = interpolate(prev.row, prev.col, current.row, current.col);
    const preview: PreviewCell[] = [];

    for (const p of path) {
      if (p.row < 0 || p.row >= grid.rows || p.col < 0 || p.col >= grid.cols) continue;

      const existing = grid.getChar(p.row, p.col);
      if (existing !== ' ' && (DENSITY[existing] ?? 0) > 0) {
        carriedChar = existing;
        distanceSincePickup = 0;
      }

      const decayed = decayChar(carriedChar, distanceSincePickup);
      if (decayed !== ' ') {
        accumulator.push({ row: p.row, col: p.col, char: decayed });
        preview.push({ row: p.row, col: p.col, char: decayed });
      }

      distanceSincePickup++;
    }

    return preview.length > 0 ? preview : null;
  },

  onDragEnd(): null {
    carriedChar = ' ';
    distanceSincePickup = 0;
    return null;
  },
};
