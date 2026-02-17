import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_PLACEHOLDER = 'Search...';
const MIN_WIDTH = 10;
const DEFAULT_WIDTH = 20;

function buildSearchPreview(row: number, col: number, width: number, placeholder: string): PreviewCell[] {
  const w = Math.max(width, 10);
  const cells: PreviewCell[] = [];
  cells.push({ row, col, char: '[' });
  cells.push({ row, col: col + 1, char: '/' });
  cells.push({ row, col: col + 2, char: ' ' });
  const maxLabel = w - 4;
  for (let i = 0; i < placeholder.length && i < maxLabel; i++) {
    cells.push({ row, col: col + 3 + i, char: placeholder[i] });
  }
  for (let c = col + 3 + Math.min(placeholder.length, maxLabel); c < col + w - 1; c++) {
    cells.push({ row, col: c, char: ' ' });
  }
  cells.push({ row, col: col + w - 1, char: ']' });
  return cells;
}

export const searchTool: DrawingTool = {
  id: 'search',
  label: 'Search',
  icon: 'Search',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'search',
        name: 'Search',
        bounds: { x: pos.col, y: pos.row, width: DEFAULT_WIDTH, height: 1 },
        placeholder: DEFAULT_PLACEHOLDER,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    if (start.row === current.row && start.col === current.col) {
      return buildSearchPreview(minR, minC, DEFAULT_WIDTH, DEFAULT_PLACEHOLDER);
    }
    const w = Math.max(maxC - minC + 1, MIN_WIDTH);
    return buildSearchPreview(minR, minC, w, DEFAULT_PLACEHOLDER);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const w = Math.max(maxC - minC + 1, MIN_WIDTH);

    return {
      kind: 'create',
      node: {
        type: 'search',
        name: 'Search',
        bounds: { x: minC, y: minR, width: w, height: 1 },
        placeholder: DEFAULT_PLACEHOLDER,
      },
    };
  },
};
