import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';

type Cell = { row: number; col: number; char: string };

function buildNavPreview(start: GridPos, end: GridPos): Cell[] {
  const minR = Math.min(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const w = maxC - minC + 1;
  if (w < 10) return [];

  const cells: Cell[] = [];

  // Row 1: Logo + links + action button
  const content = 'Logo   Link   Link   Link';
  const action = '[ Action ]';
  const row = minR;

  // Place main content
  for (let i = 0; i < content.length && minC + i <= maxC; i++) {
    cells.push({ row, col: minC + i, char: content[i] });
  }

  // Fill gap between content and action with spaces
  const actionStart = maxC - action.length + 1;
  for (let c = minC + content.length; c < actionStart && c <= maxC; c++) {
    cells.push({ row, col: c, char: ' ' });
  }

  // Place action button (right-aligned)
  if (actionStart > minC + content.length) {
    for (let i = 0; i < action.length && actionStart + i <= maxC; i++) {
      cells.push({ row, col: actionStart + i, char: action[i] });
    }
  }

  // Row 2: Separator line
  const sepR = minR + 1;
  for (let c = minC; c <= maxC; c++) {
    cells.push({ row: sepR, col: c, char: '─' });
  }

  return cells;
}

export const navTool: DrawingTool = {
  id: 'nav',
  label: 'Nav Bar',
  icon: 'PanelTop',

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'nav',
        name: 'Nav',
        bounds: { x: pos.col, y: pos.row, width: 40, height: 2 },
        logo: 'Logo',
        links: ['Link', 'Link', 'Link'],
        action: 'Action',
      },
    };
  },

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    if (start.row === current.row && start.col === current.col) {
      return buildNavPreview({ row: minR, col: minC }, { row: minR + 1, col: minC + 39 });
    }
    const w = Math.max(maxC - minC + 1, 20);
    return buildNavPreview({ row: minR, col: minC }, { row: minR + 1, col: minC + w - 1 });
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const w = Math.max(maxC - minC + 1, 20);

    return {
      kind: 'create',
      node: {
        type: 'nav',
        name: 'Nav',
        bounds: { x: minC, y: minR, width: w, height: 2 },
        logo: 'Logo',
        links: ['Link', 'Link', 'Link'],
        action: 'Action',
      },
    };
  },
};
