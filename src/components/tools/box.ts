import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';

function buildBoxPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  if (maxR - minR < 1 || maxC - minC < 2) return [];

  const cells: PreviewCell[] = [];
  for (let c = minC; c <= maxC; c++) {
    if (c === minC) { cells.push({ row: minR, col: c, char: BOX.TL }); cells.push({ row: maxR, col: c, char: BOX.BL }); }
    else if (c === maxC) { cells.push({ row: minR, col: c, char: BOX.TR }); cells.push({ row: maxR, col: c, char: BOX.BR }); }
    else { cells.push({ row: minR, col: c, char: BOX.H }); cells.push({ row: maxR, col: c, char: BOX.H }); }
  }
  for (let r = minR + 1; r < maxR; r++) {
    cells.push({ row: r, col: minC, char: BOX.V });
    cells.push({ row: r, col: maxC, char: BOX.V });
    for (let c = minC + 1; c < maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }
  return cells;
}

export const boxTool: DrawingTool = {
  id: 'box',
  label: 'Box',
  icon: 'Square',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'box',
        name: 'Box',
        bounds: { x: pos.col, y: pos.row, width: 10, height: 5 },
      },
    };
  },

  onDragStart(_pos: GridPos) { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    // When start === current (hover), show default-size preview
    if (start.row === current.row && start.col === current.col) {
      return buildBoxPreview(start, { row: start.row + 4, col: start.col + 9 });
    }
    return buildBoxPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    if (maxR - minR < 1 || maxC - minC < 2) return null;

    return {
      kind: 'create',
      node: {
        type: 'box',
        name: 'Box',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
      },
    };
  },
};
