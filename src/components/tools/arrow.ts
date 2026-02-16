import { DrawingTool, GridPos, PreviewCell, DrawResult } from './types';
import { BOX } from '@/lib/box-chars';

function buildArrow(start: GridPos, end: GridPos): { row: number; col: number; char: string }[] {
  const cells: { row: number; col: number; char: string }[] = [];
  const dr = Math.abs(end.row - start.row);
  const dc = Math.abs(end.col - start.col);

  if (dc >= dr) {
    // Horizontal arrow
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const row = start.row;
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row, col: c, char: BOX.H });
    }
    // Arrowhead at the end position
    if (end.col >= start.col) {
      cells[cells.length - 1] = { row, col: maxC, char: '→' };
    } else {
      cells[0] = { row, col: minC, char: '←' };
    }
  } else {
    // Vertical arrow
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const col = start.col;
    for (let r = minR; r <= maxR; r++) {
      cells.push({ row: r, col, char: BOX.V });
    }
    if (end.row >= start.row) {
      cells[cells.length - 1] = { row: maxR, col, char: '↓' };
    } else {
      cells[0] = { row: minR, col, char: '↑' };
    }
  }

  return cells;
}

export const arrowTool: DrawingTool = {
  id: 'arrow',
  label: 'Arrow',
  icon: 'ArrowRight',

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    return buildArrow(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): DrawResult | null {
    const chars = buildArrow(start, end);
    if (chars.length === 0) return null;
    return { chars };
  },
};
