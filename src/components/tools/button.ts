import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_LABEL = 'OK';

function buildButtonPreview(minR: number, minC: number, width: number, height: number): PreviewCell[] {
  const inner = Math.max(0, width - 2);
  if (width < 2 || height < 1) return [];
  const label = DEFAULT_LABEL.slice(0, inner);
  const labelRow = minR + Math.floor((height - 1) / 2);
  const labelCol = minC + 1 + Math.max(0, Math.floor((inner - label.length) / 2));
  const cells: PreviewCell[] = [];
  for (let r = minR; r < minR + height; r++) {
    cells.push({ row: r, col: minC, char: '[' });
    cells.push({ row: r, col: minC + width - 1, char: ']' });
  }
  for (let i = 0; i < label.length; i++) {
    cells.push({ row: labelRow, col: labelCol + i, char: label[i] });
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
    const maxR = Math.max(start.row, current.row);
    const maxC = Math.max(start.col, current.col);
    const w = Math.max(maxC - minC + 1, 6); // min "[ OK ]"
    const h = Math.max(maxR - minR + 1, 1);
    return buildButtonPreview(minR, minC, w, h);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxR = Math.max(start.row, end.row);
    const maxC = Math.max(start.col, end.col);
    const w = Math.max(maxC - minC + 1, 6);
    const h = Math.max(maxR - minR + 1, 1);
    const inner = w - 2;
    const label = DEFAULT_LABEL.slice(0, inner);

    return {
      kind: 'create',
      node: {
        type: 'button',
        name: 'Button',
        bounds: { x: minC, y: minR, width: w, height: h },
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
