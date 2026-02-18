import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';

function buildTextPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const cells: PreviewCell[] = [];

  // Fill the area with spaces to show the text region
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }

  // Show cursor placeholder on first cell
  cells.push({ row: minR, col: minC, char: '|' });

  return cells;
}

export const textTool: DrawingTool = {
  id: 'text',
  label: 'Text',
  icon: 'Type',
  needsTextInput: true,

  onClick(pos: GridPos): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'text',
        name: 'Text',
        bounds: { x: pos.col, y: pos.row, width: 1, height: 1 },
        content: '',
      },
    };
  },

  onDragStart(_pos: GridPos) {
    return [];
  },

  onDrag(start: GridPos, current: GridPos, _grid: CharGrid): PreviewCell[] | null {
    if (start.row === current.row && start.col === current.col) {
      return buildTextPreview(start, { row: start.row, col: start.col + 9 });
    }
    return buildTextPreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos, _grid: CharGrid): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);

    const width = maxC - minC + 1;

    return {
      kind: 'create',
      node: {
        type: 'text',
        name: 'Text',
        bounds: { x: minC, y: minR, width, height: maxR - minR + 1 },
        content: '',
      },
    };
  },

  onTextInput(pos: GridPos, text: string): ToolResult {
    return {
      kind: 'create',
      node: {
        type: 'text',
        name: 'Text',
        bounds: { x: pos.col, y: pos.row, width: Math.max(text.length, 1), height: 1 },
        content: text,
      },
    };
  },
};
