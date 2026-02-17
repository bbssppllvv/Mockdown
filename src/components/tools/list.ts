import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';

type Cell = { row: number; col: number; char: string };

function buildListPreview(start: GridPos, end: GridPos): Cell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const rows = maxR - minR + 1;
  if (rows < 1 || maxC - minC < 3) return [];

  const cells: Cell[] = [];

  for (let i = 0; i < rows; i++) {
    const r = minR + i;
    const label = `Item ${i + 1}`;
    const line = `\u2022 ${label}`;

    for (let j = 0; j < line.length && minC + j <= maxC; j++) {
      cells.push({ row: r, col: minC + j, char: line[j] });
    }
    // Fill remaining width with spaces
    for (let c = minC + line.length; c <= maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }

  return cells;
}

export const listTool: DrawingTool = {
  id: 'list',
  label: 'List',
  icon: 'List',

  onClick(pos: GridPos): ToolResult {
    const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];
    return {
      kind: 'create',
      node: {
        type: 'list',
        name: 'List',
        bounds: { x: pos.col, y: pos.row, width: 15, height: 5 },
        items,
      },
    };
  },

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    if (start.row === current.row && start.col === current.col) {
      return buildListPreview(start, { row: start.row + 4, col: start.col + 14 });
    }
    return buildListPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);

    const rows = maxR - minR + 1;
    if (rows < 1 || maxC - minC < 3) return null;

    const items: string[] = [];
    for (let i = 0; i < rows; i++) {
      items.push(`Item ${i + 1}`);
    }

    return {
      kind: 'create',
      node: {
        type: 'list',
        name: 'List',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: rows },
        items,
      },
    };
  },
};
