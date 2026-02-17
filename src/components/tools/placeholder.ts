import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';

type Cell = { row: number; col: number; char: string };

function chooseLabel(h: number, w: number): string {
  if (h <= 2) return 'Header';
  const aspect = w / Math.max(h, 1);
  if (aspect < 1) return 'Sidebar';
  return 'Content';
}

function buildPlaceholderPreview(start: GridPos, end: GridPos): Cell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const h = maxR - minR;
  const w = maxC - minC;
  if (h < 1 || w < 4) return [];

  const cells: Cell[] = [];

  // Draw the box border
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

  // Choose and center the label
  const label = chooseLabel(h, w);
  const labelR = minR + Math.floor(h / 2);
  const innerW = w - 1;
  const labelStart = minC + 1 + Math.floor((innerW - label.length) / 2);

  for (let i = 0; i < label.length; i++) {
    const col = labelStart + i;
    if (col > minC && col < maxC) {
      const idx = cells.findIndex((cell) => cell.row === labelR && cell.col === col);
      if (idx !== -1) cells[idx].char = label[i];
      else cells.push({ row: labelR, col, char: label[i] });
    }
  }

  return cells;
}

export const placeholderTool: DrawingTool = {
  id: 'placeholder',
  label: 'Placeholder',
  icon: 'Frame',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'placeholder',
        name: 'Placeholder',
        bounds: { x: pos.col, y: pos.row, width: 16, height: 6 },
        label: 'Content',
      },
    };
  },

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    if (start.row === current.row && start.col === current.col) {
      return buildPlaceholderPreview(start, { row: start.row + 5, col: start.col + 15 });
    }
    return buildPlaceholderPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);

    const h = maxR - minR;
    const w = maxC - minC;
    if (h < 1 || w < 4) return null;

    const label = chooseLabel(h, w);

    return {
      kind: 'create',
      node: {
        type: 'placeholder',
        name: 'Placeholder',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        label,
      },
    };
  },
};
