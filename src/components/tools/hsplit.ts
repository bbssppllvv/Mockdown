import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';

function buildHSplitPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  const h = maxR - minR;
  const w = maxC - minC;
  if (h < 1 || w < 7) return [];

  const divC = minC + Math.round(w / 3);
  const cells: PreviewCell[] = [];

  for (let r = minR; r <= maxR; r++) {
    const isTop = r === minR;
    const isBot = r === maxR;
    for (let c = minC; c <= maxC; c++) {
      const isLeft = c === minC;
      const isRight = c === maxC;
      const isDiv = c === divC;
      if (isTop) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.TL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.TR });
        else if (isDiv) cells.push({ row: r, col: c, char: BOX.T_DOWN });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isBot) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.BL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.BR });
        else if (isDiv) cells.push({ row: r, col: c, char: BOX.T_UP });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else {
        if (isLeft || isRight || isDiv) cells.push({ row: r, col: c, char: BOX.V });
        else cells.push({ row: r, col: c, char: ' ' });
      }
    }
  }
  return cells;
}

export const hsplitTool: DrawingTool = {
  id: 'hsplit',
  label: 'HSplit',
  icon: 'PanelLeft',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'hsplit',
        name: 'HSplit',
        bounds: { x: pos.col, y: pos.row, width: 24, height: 8 },
        ratio: 1 / 3,
      },
    };
  },

  onDragStart(_pos: GridPos) { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    if (start.row === current.row && start.col === current.col) {
      return buildHSplitPreview(start, { row: start.row + 7, col: start.col + 23 });
    }
    return buildHSplitPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    if (maxR - minR < 1 || maxC - minC < 7) return null;

    return {
      kind: 'create',
      node: {
        type: 'hsplit',
        name: 'HSplit',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        ratio: 1 / 3,
      },
    };
  },
};
