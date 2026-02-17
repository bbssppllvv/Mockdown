import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';

function buildTextPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const width = maxC - minC + 1;
  if (width < 4) return [];

  const cells: PreviewCell[] = [];

  // Fill the area with spaces
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      cells.push({ row: r, col: c, char: ' ' });
    }
  }

  // Write "Text" left-aligned on first row
  const label = 'Text';
  for (let i = 0; i < label.length && minC + i <= maxC; i++) {
    cells.push({ row: minR, col: minC + i, char: label[i] });
  }

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
        bounds: { x: pos.col, y: pos.row, width: 10, height: 1 },
        content: 'Text',
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
    if (width < 4) return null;

    return {
      kind: 'create',
      node: {
        type: 'text',
        name: 'Text',
        bounds: { x: minC, y: minR, width, height: maxR - minR + 1 },
        content: 'Text',
      },
    };
  },

  onTextInput(pos: GridPos, text: string): ToolResult {
    const content = text || 'Text';
    return {
      kind: 'create',
      node: {
        type: 'text',
        name: 'Text',
        bounds: { x: pos.col, y: pos.row, width: Math.max(content.length, 4), height: 1 },
        content,
      },
    };
  },
};
