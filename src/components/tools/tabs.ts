import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const BASE_TABS = ['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4', 'Tab 5', 'Tab 6'];

function computeTabCount(width: number): number {
  // Each tab ~8 chars wide on average. Min 2, max 6.
  return Math.max(2, Math.min(6, Math.floor(width / 8)));
}

function buildTabsPreview(row: number, col: number, width: number, tabNames: string[], activeIndex: number): PreviewCell[] {
  const cells: PreviewCell[] = [];
  const parts = tabNames.map((t, i) =>
    i === activeIndex ? `[ ${t} ]` : ` ${t}`
  );
  const line1 = parts.join('  ');
  const lineWidth = Math.max(line1.length, width);

  for (let i = 0; i < line1.length && col + i < col + lineWidth; i++) {
    cells.push({ row, col: col + i, char: line1[i] });
  }
  for (let i = 0; i < lineWidth; i++) {
    cells.push({ row: row + 1, col: col + i, char: '─' });
  }
  return cells;
}

export const tabsTool: DrawingTool = {
  id: 'tabs',
  label: 'Tabs',
  icon: 'SquareStack',
  needsTextInput: true,

  onClick(pos: GridPos): ToolResult {
    const tabs = BASE_TABS.slice(0, 3);
    const parts = [`[ ${tabs[0]} ]`, ` ${tabs[1]}`, `  ${tabs[2]}`];
    const lineWidth = Math.max(parts.join('  ').length, 26);
    return {
      kind: 'create',
      node: {
        type: 'tabs',
        name: 'Tabs',
        bounds: { x: pos.col, y: pos.row, width: lineWidth, height: 2 },
        tabs,
        activeIndex: 0,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    const w = Math.max(maxC - minC + 1, 20);
    const count = computeTabCount(w);
    const tabs = BASE_TABS.slice(0, count);
    return buildTabsPreview(minR, minC, w, tabs, 0);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const w = Math.max(maxC - minC + 1, 20);
    const count = computeTabCount(w);
    const tabs = BASE_TABS.slice(0, count);

    return {
      kind: 'create',
      node: {
        type: 'tabs',
        name: 'Tabs',
        bounds: { x: minC, y: minR, width: w, height: 2 },
        tabs,
        activeIndex: 0,
      },
    };
  },

  onTextInput(pos: GridPos, text: string): ToolResult {
    const label = text || 'Tab 1';
    const tabs = [label, 'Tab 2', 'Tab 3'];
    const parts = [`[ ${label} ]`, ` Tab 2`, `  Tab 3`];
    const lineWidth = Math.max(parts.join('  ').length, 26);
    return {
      kind: 'create',
      node: {
        type: 'tabs',
        name: 'Tabs',
        bounds: { x: pos.col, y: pos.row, width: lineWidth, height: 2 },
        tabs,
        activeIndex: 0,
      },
    };
  },
};
