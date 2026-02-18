import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';
import { useSceneStore } from '@/hooks/use-scene-store';

function getSmudgeRadius(): number {
  return useSceneStore.getState().toolSettings.smudge.radius;
}

// How far characters get pushed (1–3 cells in drag direction + jitter)
const MIN_SHIFT = 1;
const MAX_SHIFT = 3;

// Track which grid cells we've already displaced during this drag
// so we don't process the same source cell twice
let displaced: Set<string>;

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

function displaceArea(
  centerRow: number, centerCol: number,
  dirR: number, dirC: number,
  grid: CharGrid
): PreviewCell[] {
  const RADIUS = getSmudgeRadius();
  const cells: PreviewCell[] = [];

  for (let dr = -RADIUS; dr <= RADIUS; dr++) {
    for (let dc = -RADIUS; dc <= RADIUS; dc++) {
      // Circular radius check
      if (dr * dr + dc * dc > RADIUS * RADIUS) continue;

      const r = centerRow + dr;
      const c = centerCol + dc;
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;

      const key = `${r},${c}`;
      if (displaced.has(key)) continue;

      const ch = grid.getChar(r, c);
      if (ch === ' ') continue;

      displaced.add(key);

      // Compute displacement: shift in drag direction + perpendicular jitter
      const shift = MIN_SHIFT + Math.floor(Math.random() * (MAX_SHIFT - MIN_SHIFT + 1));
      const jitterR = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
      const jitterC = Math.floor(Math.random() * 3) - 1;

      const newR = r + dirR * shift + jitterR;
      const newC = c + dirC * shift + jitterC;

      // Erase at original position
      cells.push({ row: r, col: c, char: ' ' });

      // Place at displaced position if in bounds
      if (newR >= 0 && newR < grid.rows && newC >= 0 && newC < grid.cols) {
        cells.push({ row: newR, col: newC, char: ch });
      }
    }
  }

  return cells;
}

export const smudgeTool: DrawingTool = {
  id: 'smudge',
  label: 'Smudge',
  icon: 'Droplets',
  continuous: true,

  onDragStart(pos: GridPos, grid: CharGrid): PreviewCell[] | null {
    displaced = new Set();
    const RADIUS = getSmudgeRadius();
    // On start, scatter chars randomly outward (no drag direction yet)
    const cells: PreviewCell[] = [];
    for (let dr = -RADIUS; dr <= RADIUS; dr++) {
      for (let dc = -RADIUS; dc <= RADIUS; dc++) {
        if (dr * dr + dc * dc > RADIUS * RADIUS) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;
        const ch = grid.getChar(r, c);
        if (ch === ' ') continue;

        const key = `${r},${c}`;
        displaced.add(key);

        // Random outward push
        const jR = Math.floor(Math.random() * 3) - 1;
        const jC = Math.floor(Math.random() * 3) - 1;
        const newR = r + jR;
        const newC = c + jC;

        cells.push({ row: r, col: c, char: ' ' });
        if (newR >= 0 && newR < grid.rows && newC >= 0 && newC < grid.cols) {
          cells.push({ row: newR, col: newC, char: ch });
        }
      }
    }
    return cells.length > 0 ? cells : null;
  },

  onContinuousDrag(prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const dirR = Math.sign(current.row - prev.row);
    const dirC = Math.sign(current.col - prev.col);
    // If no movement, skip
    if (dirR === 0 && dirC === 0) return null;

    const path = interpolate(prev.row, prev.col, current.row, current.col);
    const preview: PreviewCell[] = [];

    for (const p of path) {
      const cells = displaceArea(p.row, p.col, dirR, dirC, grid);
      for (const c of cells) {
        accumulator.push(c);
        preview.push(c);
      }
    }

    return preview.length > 0 ? preview : null;
  },

  onDragEnd(): null {
    displaced = new Set();
    return null;
  },
};
