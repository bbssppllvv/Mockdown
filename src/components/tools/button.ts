import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_LABEL = 'OK';

function buildButtonPreview(minR: number, minC: number, width: number): PreviewCell[] {
  const inner = width - 4; // "[ " + " ]"
  if (inner < 1) return [];
  const label = DEFAULT_LABEL.slice(0, inner).padEnd(inner, ' ');
  const str = `[ ${label} ]`;
  const cells: PreviewCell[] = [];
  for (let i = 0; i < str.length; i++) {
    cells.push({ row: minR, col: minC + i, char: str[i] });
  }
  return cells;
}

export const buttonTool: DrawingTool = {
  id: 'button',
  label: 'Button',
  icon: 'RectangleHorizontal',
  needsTextInput: true,

  onClick(pos: GridPos): ToolResult {
    const label = DEFAULT_LABEL;
    const w = label.length + 4; // "[ OK ]"
    return {
      kind: 'create',
      node: {
        type: 'button',
        name: 'Button',
        bounds: { x: pos.col, y: pos.row, width: w, height: 1 },
        label,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    const w = Math.max(maxC - minC + 1, 6); // min "[ OK ]"
    return buildButtonPreview(minR, minC, w);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const w = Math.max(maxC - minC + 1, 6);
    const inner = w - 4;
    const label = DEFAULT_LABEL.slice(0, inner);

    return {
      kind: 'create',
      node: {
        type: 'button',
        name: 'Button',
        bounds: { x: minC, y: minR, width: w, height: 1 },
        label,
      },
    };
  },

  onTextInput(pos: GridPos, text: string): ToolResult {
    const label = text || DEFAULT_LABEL;
    const w = label.length + 4;
    return {
      kind: 'create',
      node: {
        type: 'button',
        name: 'Button',
        bounds: { x: pos.col, y: pos.row, width: w, height: 1 },
        label,
      },
    };
  },
};
