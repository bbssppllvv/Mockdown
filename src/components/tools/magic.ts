import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';

function buildSelectionPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  if (maxR - minR < 1 || maxC - minC < 2) return [];

  const cells: PreviewCell[] = [];

  // Top and bottom edges
  for (let c = minC; c <= maxC; c++) {
    const ch = c === minC || c === maxC ? '+' : '-';
    cells.push({ row: minR, col: c, char: ch });
    cells.push({ row: maxR, col: c, char: ch });
  }

  // Left and right edges + interior
  for (let r = minR + 1; r < maxR; r++) {
    cells.push({ row: r, col: minC, char: '|' });
    cells.push({ row: r, col: maxC, char: '|' });
    for (let c = minC + 1; c < maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }

  return cells;
}

export const magicTool: DrawingTool = {
  id: 'magic',
  label: 'Magic',
  icon: 'Wand2',

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos, _grid: CharGrid): PreviewCell[] | null {
    return buildSelectionPreview(start, current);
  },

  // onDragEnd returns null — the mouse hook handles magic specially
  onDragEnd() {
    return null;
  },
};
