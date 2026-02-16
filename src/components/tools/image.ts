import { DrawingTool, GridPos, PreviewCell, DrawResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';

function buildImage(
  start: GridPos,
  end: GridPos,
  grid: CharGrid
): { row: number; col: number; char: string }[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  if (maxR - minR < 1 || maxC - minC < 2) return [];

  const cells: { row: number; col: number; char: string }[] = [];

  // Top and bottom edges
  for (let c = minC; c <= maxC; c++) {
    if (c === minC) {
      cells.push({ row: minR, col: c, char: BOX.TL });
      cells.push({ row: maxR, col: c, char: BOX.BL });
    } else if (c === maxC) {
      cells.push({ row: minR, col: c, char: BOX.TR });
      cells.push({ row: maxR, col: c, char: BOX.BR });
    } else {
      cells.push({ row: minR, col: c, char: BOX.H });
      cells.push({ row: maxR, col: c, char: BOX.H });
    }
  }

  // Left and right edges
  for (let r = minR + 1; r < maxR; r++) {
    cells.push({ row: r, col: minC, char: BOX.V });
    cells.push({ row: r, col: maxC, char: BOX.V });
  }

  // Interior: fill with spaces first
  const innerH = maxR - minR - 1;
  const innerW = maxC - minC - 1;

  for (let r = minR + 1; r < maxR; r++) {
    for (let c = minC + 1; c < maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }

  if (innerH <= 0 || innerW <= 0) return cells;

  // Draw X diagonals inside the box
  for (let i = 0; i < innerH; i++) {
    const r = minR + 1 + i;

    // Top-left to bottom-right diagonal
    const c1 = minC + 1 + Math.round((i * (innerW - 1)) / Math.max(innerH - 1, 1));
    if (c1 > minC && c1 < maxC) {
      cells.push({ row: r, col: c1, char: '\\' });
    }

    // Top-right to bottom-left diagonal
    const c2 =
      minC + 1 + (innerW - 1) - Math.round((i * (innerW - 1)) / Math.max(innerH - 1, 1));
    if (c2 > minC && c2 < maxC && c2 !== c1) {
      cells.push({ row: r, col: c2, char: '/' });
    }
  }

  // Center "IMG" label if it fits
  const label = 'IMG';
  if (innerW >= label.length && innerH >= 1) {
    const midR = minR + 1 + Math.floor(innerH / 2);
    const startC = minC + 1 + Math.floor((innerW - label.length) / 2);
    for (let i = 0; i < label.length; i++) {
      cells.push({ row: midR, col: startC + i, char: label[i] });
    }
  }

  return cells;
}

export const imageTool: DrawingTool = {
  id: 'image',
  label: 'Image',
  icon: 'Image',

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos, grid: CharGrid): PreviewCell[] | null {
    const cells = buildImage(start, current, grid);
    return cells.map((c) => ({ row: c.row, col: c.col, char: c.char }));
  },

  onDragEnd(start: GridPos, end: GridPos, grid: CharGrid): DrawResult | null {
    const chars = buildImage(start, end, grid);
    if (chars.length === 0) return null;
    return { chars };
  },
};
