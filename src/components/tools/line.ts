import { DrawingTool, GridPos, PreviewCell, DrawResult } from './types';

function buildLine(start: GridPos, end: GridPos): { row: number; col: number; char: string }[] {
  const cells: { row: number; col: number; char: string }[] = [];
  const dr = Math.abs(end.row - start.row);
  const dc = Math.abs(end.col - start.col);

  if (dc >= dr) {
    // Horizontal line
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const row = start.row;
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row, col: c, char: '-' });
    }
  } else {
    // Vertical line
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const col = start.col;
    for (let r = minR; r <= maxR; r++) {
      cells.push({ row: r, col, char: '|' });
    }
  }

  return cells;
}

export const lineTool: DrawingTool = {
  id: 'line',
  label: 'Line',
  icon: 'Minus',

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    return buildLine(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): DrawResult | null {
    const chars = buildLine(start, end);
    if (chars.length === 0) return null;
    return { chars };
  },
};
