import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';
import { useSceneStore } from '@/hooks/use-scene-store';

function getPencilChar(): string {
  return useSceneStore.getState().toolSettings.pencil.char;
}

/** Bresenham line interpolation between two grid positions. */
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

export const pencilTool: DrawingTool = {
  id: 'pencil',
  label: 'Pencil',
  icon: 'Pencil',
  continuous: true,

  onDragStart(pos: GridPos): PreviewCell[] | null {
    const ch = getPencilChar();
    return [{ row: pos.row, col: pos.col, char: ch }];
  },

  onContinuousDrag(prev: GridPos, current: GridPos, _grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const ch = getPencilChar();
    const path = interpolate(prev.row, prev.col, current.row, current.col);
    const preview: PreviewCell[] = [];
    for (const p of path) {
      accumulator.push({ row: p.row, col: p.col, char: ch });
      preview.push({ row: p.row, col: p.col, char: ch });
    }
    return preview;
  },

  onDragEnd(): null {
    return null;
  },
};
