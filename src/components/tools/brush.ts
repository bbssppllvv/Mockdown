import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';

// 3x3 brush kernel: center dense, edges lighter
const BRUSH_KERNEL: { dr: number; dc: number; char: string }[] = [
  { dr: -1, dc: -1, char: '\u2591' },
  { dr: -1, dc:  0, char: '\u2592' },
  { dr: -1, dc:  1, char: '\u2591' },
  { dr:  0, dc: -1, char: '\u2592' },
  { dr:  0, dc:  0, char: '\u2588' },
  { dr:  0, dc:  1, char: '\u2592' },
  { dr:  1, dc: -1, char: '\u2591' },
  { dr:  1, dc:  0, char: '\u2592' },
  { dr:  1, dc:  1, char: '\u2591' },
];

const DENSITY: Record<string, number> = { ' ': 0, '\u2591': 1, '\u2592': 2, '\u2593': 3, '\u2588': 4 };

function stampBrush(row: number, col: number, grid: CharGrid): { row: number; col: number; char: string }[] {
  const cells: { row: number; col: number; char: string }[] = [];
  for (const k of BRUSH_KERNEL) {
    const r = row + k.dr;
    const c = col + k.dc;
    if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
      const existing = grid.getChar(r, c);
      const existingD = DENSITY[existing] ?? 0;
      const newD = DENSITY[k.char] ?? 0;
      if (newD > existingD) {
        cells.push({ row: r, col: c, char: k.char });
      }
    }
  }
  return cells;
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

export const brushTool: DrawingTool = {
  id: 'brush',
  label: 'Brush',
  icon: 'Paintbrush',
  continuous: true,

  onDragStart(pos: GridPos, grid: CharGrid): PreviewCell[] | null {
    return stampBrush(pos.row, pos.col, grid);
  },

  onContinuousDrag(prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const path = interpolate(prev.row, prev.col, current.row, current.col);
    // Collect all stamps, keeping highest density per cell
    const cellMap = new Map<string, { row: number; col: number; char: string }>();
    for (const p of path) {
      const stamp = stampBrush(p.row, p.col, grid);
      for (const c of stamp) {
        const key = `${c.row},${c.col}`;
        const existing = cellMap.get(key);
        if (!existing || (DENSITY[c.char] ?? 0) > (DENSITY[existing.char] ?? 0)) {
          cellMap.set(key, c);
        }
      }
    }
    const preview: PreviewCell[] = [];
    for (const c of cellMap.values()) {
      accumulator.push({ row: c.row, col: c.col, char: c.char });
      preview.push({ row: c.row, col: c.col, char: c.char });
    }
    return preview;
  },

  onDragEnd(): null {
    return null;
  },
};
