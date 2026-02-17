import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { BOX } from '@/lib/box-chars';

function buildModalPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  const h = maxR - minR;
  const w = maxC - minC;
  if (h < 3 || w < 9) return [];

  const cells: PreviewCell[] = [];

  // Box border
  for (let r = minR; r <= maxR; r++) {
    const isTop = r === minR;
    const isBot = r === maxR;
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
      } else {
        if (isLeft || isRight) cells.push({ row: r, col: c, char: BOX.V });
        else cells.push({ row: r, col: c, char: ' ' });
      }
    }
  }

  // Title row
  const title = 'Dialog';
  for (let i = 0; i < title.length && minC + 2 + i < maxC; i++) {
    const idx = cells.findIndex(c => c.row === minR + 1 && c.col === minC + 2 + i);
    if (idx !== -1) cells[idx].char = title[i];
  }
  // Close X
  if (w >= 5) {
    const idx = cells.findIndex(c => c.row === minR + 1 && c.col === maxC - 2);
    if (idx !== -1) cells[idx].char = '×';
  }

  // Title divider
  if (minR + 2 < maxR) {
    const divIdx = cells.findIndex(c => c.row === minR + 2 && c.col === minC);
    if (divIdx !== -1) cells[divIdx].char = BOX.T_RIGHT;
    const divIdx2 = cells.findIndex(c => c.row === minR + 2 && c.col === maxC);
    if (divIdx2 !== -1) cells[divIdx2].char = BOX.T_LEFT;
    for (let c = minC + 1; c < maxC; c++) {
      const idx = cells.findIndex(cell => cell.row === minR + 2 && cell.col === c);
      if (idx !== -1) cells[idx].char = BOX.H;
    }
  }

  // Action buttons on last interior row
  const btnRow = maxR - 1;
  if (btnRow > minR + 2) {
    const btns = '[ Cancel ] [ OK ]';
    const btnStart = maxC - 1 - btns.length;
    if (btnStart > minC) {
      for (let i = 0; i < btns.length; i++) {
        const idx = cells.findIndex(c => c.row === btnRow && c.col === btnStart + i);
        if (idx !== -1) cells[idx].char = btns[i];
      }
    }
  }

  return cells;
}

export const modalTool: DrawingTool = {
  id: 'modal',
  label: 'Modal',
  icon: 'AppWindow',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'modal',
        name: 'Modal',
        bounds: { x: pos.col, y: pos.row, width: 30, height: 10 },
        title: 'Dialog',
      },
    };
  },

  onDragStart(_pos: GridPos) { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    if (start.row === current.row && start.col === current.col) {
      return buildModalPreview(start, { row: start.row + 9, col: start.col + 29 });
    }
    return buildModalPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    if (maxR - minR < 3 || maxC - minC < 9) return null;

    return {
      kind: 'create',
      node: {
        type: 'modal',
        name: 'Modal',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        title: 'Dialog',
      },
    };
  },
};
