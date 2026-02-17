import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';

function buildCardPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  if (maxR - minR < 2 || maxC - minC < 5) return [];

  const cells: PreviewCell[] = [];
  const divR = minR + 2;
  const hasDivider = divR < maxR;

  for (let r = minR; r <= maxR; r++) {
    const isTop = r === minR;
    const isBot = r === maxR;
    const isDiv = hasDivider && r === divR;
    for (let c = minC; c <= maxC; c++) {
      const isLeft = c === minC;
      const isRight = c === maxC;
      if (isTop) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.TL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.TR });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isBot) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.BL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.BR });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isDiv) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.T_RIGHT });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.T_LEFT });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else {
        if (isLeft || isRight) cells.push({ row: r, col: c, char: BOX.V });
        else cells.push({ row: r, col: c, char: ' ' });
      }
    }
  }

  const title = 'Title';
  const titleR = minR + 1;
  const titleStart = minC + 2;
  for (let i = 0; i < title.length && titleStart + i < maxC; i++) {
    const idx = cells.findIndex(cell => cell.row === titleR && cell.col === titleStart + i);
    if (idx !== -1) cells[idx].char = title[i];
    else cells.push({ row: titleR, col: titleStart + i, char: title[i] });
  }

  return cells;
}

export const cardTool: DrawingTool = {
  id: 'card',
  label: 'Card',
  icon: 'CreditCard',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'card',
        name: 'Card',
        bounds: { x: pos.col, y: pos.row, width: 20, height: 8 },
        title: 'Title',
      },
    };
  },

  onDragStart(_pos: GridPos) { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    if (start.row === current.row && start.col === current.col) {
      return buildCardPreview(start, { row: start.row + 7, col: start.col + 19 });
    }
    return buildCardPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    if (maxR - minR < 2 || maxC - minC < 5) return null;

    return {
      kind: 'create',
      node: {
        type: 'card',
        name: 'Card',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        title: 'Title',
      },
    };
  },
};
