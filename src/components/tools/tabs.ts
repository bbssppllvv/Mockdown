import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { NewNodeData } from '@/lib/scene/types';

const BASE_TABS = ['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4', 'Tab 5', 'Tab 6'];

function computeTabCount(width: number): number {
  return Math.max(2, Math.min(6, Math.floor(width / 8)));
}

function tabToken(label: string, active: boolean): string {
  return active ? `[ ${label} ]` : ` ${label}`;
}

function buildTabsPreview(row: number, col: number, width: number, tabNames: string[], activeIndex: number): PreviewCell[] {
  const cells: PreviewCell[] = [];
  const parts = tabNames.map((t, i) => tabToken(t, i === activeIndex));
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

function buildTabsNodes(x: number, y: number, width: number, tabs: string[], activeIndex: number): NewNodeData[] {
  const maxC = x + width - 1;
  const dividerRow = y + 1;
  const nodes: NewNodeData[] = [];

  let cursor = x;
  for (let i = 0; i < tabs.length; i++) {
    const token = tabToken(tabs[i], i === activeIndex);
    if (cursor > maxC) break;
    const available = maxC - cursor + 1;
    const content = token.slice(0, available);
    if (!content) break;
    nodes.push({
      type: 'text',
      name: `Tab ${i + 1}`,
      bounds: { x: cursor, y, width: content.length, height: 1 },
      content,
    });
    cursor += token.length + 2;
  }

  nodes.push({
    type: 'line',
    name: 'Tabs Divider',
    bounds: { x, y: dividerRow, width, height: 1 },
    points: [
      { row: dividerRow, col: x },
      { row: dividerRow, col: maxC },
    ],
  });

  return nodes;
}

function createTabsResult(minR: number, minC: number, width: number, firstLabel?: string): ToolResult {
  const safeWidth = Math.max(width, 20);
  const count = computeTabCount(safeWidth);
  const tabs = BASE_TABS.slice(0, count);
  if (firstLabel && tabs.length > 0) tabs[0] = firstLabel;
  const nodes = buildTabsNodes(minC, minR, safeWidth, tabs, 0);
  return { kind: 'createMany', nodes, groupName: 'Tabs' };
}

export const tabsTool: DrawingTool = {
  id: 'tabs',
  label: 'Tabs',
  icon: 'SquareStack',

  onClick(pos: GridPos): ToolResult {
    return createTabsResult(pos.row, pos.col, 26);
  },

  onDragStart() {
    return [];
  },

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
    return createTabsResult(minR, minC, maxC - minC + 1);
  },

  onTextInput(pos: GridPos, text: string): ToolResult {
    return createTabsResult(pos.row, pos.col, 26, text || 'Tab 1');
  },
};
