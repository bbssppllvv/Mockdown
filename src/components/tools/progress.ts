import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_VALUE = 60;
const MIN_WIDTH = 10;
const DEFAULT_WIDTH = 20;

function buildProgressPreview(row: number, col: number, width: number, value: number): PreviewCell[] {
  const w = Math.max(width, 10);
  const pct = Math.max(0, Math.min(100, value));
  const label = ` ${pct}%`;
  const barWidth = w - 2 - label.length;
  if (barWidth < 2) return [];

  const filled = Math.round((pct / 100) * barWidth);
  const cells: PreviewCell[] = [];
  cells.push({ row, col, char: '[' });
  for (let i = 0; i < barWidth; i++) {
    cells.push({ row, col: col + 1 + i, char: i < filled ? '█' : '░' });
  }
  cells.push({ row, col: col + 1 + barWidth, char: ']' });
  for (let i = 0; i < label.length; i++) {
    cells.push({ row, col: col + 2 + barWidth + i, char: label[i] });
  }
  return cells;
}

export const progressTool: DrawingTool = {
  id: 'progress',
  label: 'Progress',
  icon: 'Loader',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'progress',
        name: 'Progress',
        bounds: { x: pos.col, y: pos.row, width: DEFAULT_WIDTH, height: 1 },
        value: DEFAULT_VALUE,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    if (start.row === current.row && start.col === current.col) {
      return buildProgressPreview(minR, minC, DEFAULT_WIDTH, DEFAULT_VALUE);
    }
    const w = Math.max(maxC - minC + 1, MIN_WIDTH);
    return buildProgressPreview(minR, minC, w, DEFAULT_VALUE);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const w = Math.max(maxC - minC + 1, MIN_WIDTH);

    return {
      kind: 'create',
      node: {
        type: 'progress',
        name: 'Progress',
        bounds: { x: minC, y: minR, width: w, height: 1 },
        value: DEFAULT_VALUE,
      },
    };
  },
};
