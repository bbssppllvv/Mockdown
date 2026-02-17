import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';

const SCATTER_CHARS = ['★', '☆', '✦', '✧', '✶', '✴', '●', '○', '◆', '◇', '♦', '♥', '♠', '♣'];
const SCATTER_RADIUS = 4;
const SCATTER_DENSITY = 3;

function scatterAt(row: number, col: number, grid: CharGrid): PreviewCell[] {
  const cells: PreviewCell[] = [];
  for (let i = 0; i < SCATTER_DENSITY; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * SCATTER_RADIUS;
    const dr = Math.round(Math.sin(angle) * dist);
    const dc = Math.round(Math.cos(angle) * dist);
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
      const ch = SCATTER_CHARS[Math.floor(Math.random() * SCATTER_CHARS.length)];
      cells.push({ row: r, col: c, char: ch });
    }
  }
  return cells;
}

export const scatterTool: DrawingTool = {
  id: 'scatter',
  label: 'Scatter',
  icon: 'Sparkles',
  continuous: true,

  onDragStart(pos: GridPos, grid: CharGrid): PreviewCell[] | null {
    return scatterAt(pos.row, pos.col, grid);
  },

  onContinuousDrag(_prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const cells = scatterAt(current.row, current.col, grid);
    for (const c of cells) {
      accumulator.push({ row: c.row, col: c.col, char: c.char });
    }
    return cells;
  },

  onDragEnd(): null {
    return null;
  },
};
