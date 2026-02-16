import { DrawingTool, GridPos, PreviewCell, DrawResult } from './types';

function buildErased(start: GridPos, end: GridPos): { row: number; col: number; char: string }[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const cells: { row: number; col: number; char: string }[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }
  return cells;
}

export const eraserTool: DrawingTool = {
  id: 'eraser',
  label: 'Eraser',
  icon: 'Eraser',

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    return buildErased(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): DrawResult | null {
    const chars = buildErased(start, end);
    if (chars.length === 0) return null;
    return { chars };
  },

  onClick(pos: GridPos): DrawResult | null {
    return { chars: [{ row: pos.row, col: pos.col, char: ' ' }] };
  },
};
