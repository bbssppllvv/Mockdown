import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_CURRENT = 3;
const DEFAULT_TOTAL = 10;

function buildPaginationStr(current: number, total: number): string {
  const parts: string[] = ['<'];
  const maxVisible = Math.min(total, 5);
  let startPage = Math.max(1, current - 2);
  if (startPage + maxVisible - 1 > total) startPage = Math.max(1, total - maxVisible + 1);

  for (let p = startPage; p < startPage + maxVisible; p++) {
    parts.push(p === current ? `[${p}]` : `${p}`);
  }
  if (startPage + maxVisible - 1 < total) parts.push('...');
  parts.push('>');
  return parts.join(' ');
}

function buildPaginationPreview(row: number, col: number, current: number, total: number): PreviewCell[] {
  const str = buildPaginationStr(current, total);
  const cells: PreviewCell[] = [];
  for (let i = 0; i < str.length; i++) {
    cells.push({ row, col: col + i, char: str[i] });
  }
  return cells;
}

function totalForWidth(width: number): number {
  if (width < 15) return 5;
  if (width < 25) return 10;
  return 20;
}

export const paginationTool: DrawingTool = {
  id: 'pagination',
  label: 'Pagination',
  icon: 'MoreHorizontal',

  onClick(pos: GridPos): ToolResult {
    const str = buildPaginationStr(DEFAULT_CURRENT, DEFAULT_TOTAL);
    return {
      kind: 'create',
      node: {
        type: 'pagination',
        name: 'Pagination',
        bounds: { x: pos.col, y: pos.row, width: str.length, height: 1 },
        currentPage: DEFAULT_CURRENT,
        totalPages: DEFAULT_TOTAL,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    const dragW = maxC - minC + 1;
    const total = dragW <= 1 ? DEFAULT_TOTAL : totalForWidth(dragW);
    return buildPaginationPreview(minR, minC, DEFAULT_CURRENT, total);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const dragW = maxC - minC + 1;
    const total = dragW < 3 ? DEFAULT_TOTAL : totalForWidth(dragW);
    const str = buildPaginationStr(DEFAULT_CURRENT, total);
    const w = Math.max(dragW, str.length);

    return {
      kind: 'create',
      node: {
        type: 'pagination',
        name: 'Pagination',
        bounds: { x: minC, y: minR, width: w, height: 1 },
        currentPage: DEFAULT_CURRENT,
        totalPages: total,
      },
    };
  },
};
