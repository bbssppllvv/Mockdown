import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_LABEL = 'Label';

function buildTogglePreview(row: number, col: number, width: number, label: string, on: boolean): PreviewCell[] {
  const toggle = on ? '[━●]' : '[●━]';
  const str = `${toggle} ${label}`;
  const w = Math.max(width, str.length);
  const cells: PreviewCell[] = [];
  for (let i = 0; i < w; i++) {
    cells.push({ row, col: col + i, char: i < str.length ? str[i] : ' ' });
  }
  return cells;
}

export const toggleTool: DrawingTool = {
  id: 'toggle',
  label: 'Toggle',
  icon: 'ToggleLeft',
  needsTextInput: true,

  onClick(pos: GridPos): ToolResult {
    const str = `[●━] ${DEFAULT_LABEL}`;
    return {
      kind: 'create',
      node: {
        type: 'toggle',
        name: 'Toggle',
        bounds: { x: pos.col, y: pos.row, width: str.length, height: 1 },
        label: DEFAULT_LABEL,
        on: false,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    const w = Math.max(maxC - minC + 1, (`[●━] ${DEFAULT_LABEL}`).length);
    return buildTogglePreview(minR, minC, w, DEFAULT_LABEL, false);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const str = `[●━] ${DEFAULT_LABEL}`;
    const w = Math.max(maxC - minC + 1, str.length);
    return {
      kind: 'create',
      node: {
        type: 'toggle',
        name: 'Toggle',
        bounds: { x: minC, y: minR, width: w, height: 1 },
        label: DEFAULT_LABEL,
        on: false,
      },
    };
  },

  onTextInput(pos: GridPos, text: string): ToolResult {
    const label = text || DEFAULT_LABEL;
    const str = `[●━] ${label}`;
    return {
      kind: 'create',
      node: {
        type: 'toggle',
        name: 'Toggle',
        bounds: { x: pos.col, y: pos.row, width: str.length, height: 1 },
        label,
        on: false,
      },
    };
  },
};
