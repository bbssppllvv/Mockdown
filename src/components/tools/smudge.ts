import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';

const DENSITY_CHARS = [' ', '\u2591', '\u2592', '\u2593', '\u2588'];
const DENSITY: Record<string, number> = { ' ': 0, '\u2591': 1, '\u2592': 2, '\u2593': 3, '\u2588': 4 };
const DECAY_INTERVAL = 4; // cells before density drops by 1 level

let carriedChar = ' ';
let carriedDensity = 0;
let totalDistance = 0;

function decayedChar(): string {
  const decay = Math.floor(totalDistance / DECAY_INTERVAL);
  const level = Math.max(0, carriedDensity - decay);
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
    // Only activate if there's actual content to smudge
    if (ch === ' ') {
      carriedChar = ' ';
      carriedDensity = 0;
      totalDistance = 0;
      return null;
    }
    carriedChar = ch;
    // Map any non-density character (letters, symbols, box-drawing) to full density
    carriedDensity = DENSITY[ch] ?? 4;
    totalDistance = 0;
    // Show feedback at start position
    return [{ row: pos.row, col: pos.col, char: ch }];
  },

  onContinuousDrag(prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    // Nothing picked up — do nothing
    if (carriedDensity === 0) return null;

    const path = interpolate(prev.row, prev.col, current.row, current.col);
    const preview: PreviewCell[] = [];

    for (const p of path) {
      if (p.row < 0 || p.row >= grid.rows || p.col < 0 || p.col >= grid.cols) continue;

      totalDistance++;
      const ch = decayedChar();
      if (ch === ' ') break; // fully decayed, stop

      accumulator.push({ row: p.row, col: p.col, char: ch });
      preview.push({ row: p.row, col: p.col, char: ch });
    }

    return preview.length > 0 ? preview : null;
  },

  onDragEnd(): null {
    carriedChar = ' ';
    carriedDensity = 0;
    totalDistance = 0;
    return null;
  },
};
