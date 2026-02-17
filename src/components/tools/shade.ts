import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';

const SHADE_LEVELS = [' ', '\u2591', '\u2592', '\u2593', '\u2588'];

function nextShade(current: string): string {
  const idx = SHADE_LEVELS.indexOf(current);
  if (idx === -1) return SHADE_LEVELS[1]; // non-shade char -> start from light shade
  if (idx >= SHADE_LEVELS.length - 1) return current; // already at max
  return SHADE_LEVELS[idx + 1];
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

export const shadeTool: DrawingTool = {
  id: 'shade',
  label: 'Shade',
  icon: 'Contrast',
  continuous: true,

  onDragStart(pos: GridPos, grid: CharGrid): PreviewCell[] | null {
    const existing = grid.getChar(pos.row, pos.col);
    return [{ row: pos.row, col: pos.col, char: nextShade(existing) }];
  },

  onContinuousDrag(prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const path = interpolate(prev.row, prev.col, current.row, current.col);
    const preview: PreviewCell[] = [];
    for (const p of path) {
      const ch = nextShade(grid.getChar(p.row, p.col));
      accumulator.push({ row: p.row, col: p.col, char: ch });
      preview.push({ row: p.row, col: p.col, char: ch });
    }
    return preview;
  },

  onDragEnd(): null {
    return null;
  },
};
