import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { NewNodeData } from '@/lib/scene/types';
import { useSceneStore } from '@/hooks/use-scene-store';

function getNavSettings() {
  const s = useSceneStore.getState().toolSettings.nav;
  return {
    logo: s.defaultLogo,
    links: s.defaultLinks.split(',').map(l => l.trim()).filter(Boolean),
    action: s.defaultAction,
  };
}

function buildNavPreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);

  const w = maxC - minC + 1;
  if (w < 10) return [];

  const { logo, links, action } = getNavSettings();
  const cells: PreviewCell[] = [];
  const content = logo + '   ' + links.join('   ');
  const actionStr = '[ ' + action + ' ]';
  const row = minR;

  for (let i = 0; i < content.length && minC + i <= maxC; i++) {
    cells.push({ row, col: minC + i, char: content[i] });
  }

  const actionStart = maxC - actionStr.length + 1;
  for (let c = minC + content.length; c < actionStart && c <= maxC; c++) {
    cells.push({ row, col: c, char: ' ' });
  }

  if (actionStart > minC + content.length) {
    for (let i = 0; i < actionStr.length && actionStart + i <= maxC; i++) {
      cells.push({ row, col: actionStart + i, char: actionStr[i] });
    }
  }

  const sepR = minR + 1;
  for (let c = minC; c <= maxC; c++) {
    cells.push({ row: sepR, col: c, char: '─' });
  }

  return cells;
}

function buildNavNodes(x: number, y: number, width: number, logo: string, links: string[], action: string): NewNodeData[] {
  const maxC = x + width - 1;
  const separatorRow = y + 1;
  const actionLabel = `[ ${action} ]`;
  const actionX = maxC - actionLabel.length + 1;

  const nodes: NewNodeData[] = [];
  nodes.push({
    type: 'text',
    name: 'Nav Logo',
    bounds: { x, y, width: Math.max(1, Math.min(logo.length, width)), height: 1 },
    content: logo,
  });

  let cursor = x + logo.length + 3;
  for (let i = 0; i < links.length; i++) {
    if (cursor >= actionX - 1) break;
    const maxLinkWidth = Math.max(1, actionX - cursor - 1);
    const content = links[i].slice(0, maxLinkWidth);
    if (!content) break;
    nodes.push({
      type: 'text',
      name: `Nav Link ${i + 1}`,
      bounds: { x: cursor, y, width: content.length, height: 1 },
      content,
    });
    cursor += content.length + 3;
  }

  if (actionX > x) {
    nodes.push({
      type: 'button',
      name: 'Nav Action',
      bounds: { x: actionX, y, width: actionLabel.length, height: 1 },
      label: action,
    });
  }

  nodes.push({
    type: 'line',
    name: 'Nav Divider',
    bounds: { x, y: separatorRow, width, height: 1 },
    points: [
      { row: separatorRow, col: x },
      { row: separatorRow, col: maxC },
    ],
  });

  return nodes;
}

function createNavResult(minR: number, minC: number, width: number): ToolResult {
  if (width < 10) return null;
  const { logo, links, action } = getNavSettings();
  const nodes = buildNavNodes(minC, minR, width, logo, links, action);
  return { kind: 'createMany', nodes, groupName: 'Nav Bar' };
}

export const navTool: DrawingTool = {
  id: 'nav',
  label: 'Nav Bar',
  icon: 'PanelTop',

  onClick(pos: GridPos): ToolResult {
    return createNavResult(pos.row, pos.col, 40);
  },

  onDragStart() {
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
    return createNavResult(minR, minC, Math.max(maxC - minC + 1, 20));
  },
};
