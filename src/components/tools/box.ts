import { DrawingTool, GridPos, PreviewCell, DrawResult } from './types';
import { CharGrid } from '@/lib/grid-model';

function buildBox(start: GridPos, end: GridPos, grid: CharGrid): { row: number; col: number; char: string }[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  if (maxR - minR < 1 || maxC - minC < 2) return [];

  const cells: { row: number; col: number; char: string }[] = [];

  // Top and bottom edges
  for (let c = minC; c <= maxC; c++) {
    if (c === minC || c === maxC) {
      cells.push({ row: minR, col: c, char: '+' });
      cells.push({ row: maxR, col: c, char: '+' });
    } else {
      cells.push({ row: minR, col: c, char: '-' });
      cells.push({ row: maxR, col: c, char: '-' });
    }
  }

  // Left and right edges
  for (let r = minR + 1; r < maxR; r++) {
    cells.push({ row: r, col: minC, char: '|' });
    cells.push({ row: r, col: maxC, char: '|' });
    // Preserve existing text inside the box
    for (let c = minC + 1; c < maxC; c++) {
      const existing = grid.getChar(r, c);
      if (existing === ' ') {
        cells.push({ row: r, col: c, char: ' ' });
      }
      // If there's existing text, we don't add it to cells (preserve it)
    }
  }

  return cells;
}

export const boxTool: DrawingTool = {
  id: 'box',
  label: 'Box',
  icon: 'Square',

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos, grid: CharGrid): PreviewCell[] | null {
    const cells = buildBox(start, current, grid);
    return cells.map((c) => ({ row: c.row, col: c.col, char: c.char }));
  },

  onDragEnd(start: GridPos, end: GridPos, grid: CharGrid): DrawResult | null {
    const chars = buildBox(start, end, grid);
    if (chars.length === 0) return null;
    return { chars };
  },
};
