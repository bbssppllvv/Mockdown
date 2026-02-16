import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';

function buildSelectionPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  if (maxR - minR < 1 || maxC - minC < 2) return [];

  const cells: PreviewCell[] = [];

  // Top and bottom edges
  for (let c = minC; c <= maxC; c++) {
    let ch: string;
    if (c === minC) ch = BOX.TL;
    else if (c === maxC) ch = BOX.TR;
    else ch = BOX.H;
    cells.push({ row: minR, col: c, char: ch });

    let bch: string;
    if (c === minC) bch = BOX.BL;
    else if (c === maxC) bch = BOX.BR;
    else bch = BOX.H;
    cells.push({ row: maxR, col: c, char: bch });
  }

  // Left and right edges + interior
  for (let r = minR + 1; r < maxR; r++) {
    cells.push({ row: r, col: minC, char: BOX.V });
    cells.push({ row: r, col: maxC, char: BOX.V });
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
