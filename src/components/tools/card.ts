import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { BOX } from '@/lib/box-chars';
import { NewNodeData } from '@/lib/scene/types';
import { useSceneStore } from '@/hooks/use-scene-store';

function getCardSettings() {
  return useSceneStore.getState().toolSettings.card;
}

function buildCardPreview(start: GridPos, end: GridPos, title: string): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  if (maxR - minR < 2 || maxC - minC < 5) return [];

  const cells: PreviewCell[] = [];
  const divR = minR + 2;
  const hasDivider = divR < maxR;

  for (let r = minR; r <= maxR; r++) {
    const isTop = r === minR;
    const isBot = r === maxR;
    const isDiv = hasDivider && r === divR;
    for (let c = minC; c <= maxC; c++) {
      const isLeft = c === minC;
      const isRight = c === maxC;
      if (isTop) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.TL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.TR });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isBot) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.BL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.BR });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isDiv) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.T_RIGHT });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.T_LEFT });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else {
        if (isLeft || isRight) cells.push({ row: r, col: c, char: BOX.V });
        else cells.push({ row: r, col: c, char: ' ' });
      }
    }
  }

  const titleR = minR + 1;
  const titleStart = minC + 2;
  for (let i = 0; i < title.length && titleStart + i < maxC; i++) {
    const idx = cells.findIndex(cell => cell.row === titleR && cell.col === titleStart + i);
    if (idx !== -1) cells[idx].char = title[i];
  }

  return cells;
}

function buildCardNodes(x: number, y: number, width: number, height: number, title: string): NewNodeData[] {
  const maxC = x + width - 1;
  const dividerRow = y + 2;

  const nodes: NewNodeData[] = [
    {
      type: 'box',
      name: 'Card Frame',
      bounds: { x, y, width, height },
    },
    {
      type: 'text',
      name: 'Card Title',
      bounds: { x: x + 2, y: y + 1, width: Math.max(1, Math.min(title.length, Math.max(1, width - 5))), height: 1 },
      content: title,
    },
  ];

  if (dividerRow < y + height - 1) {
    nodes.push({
      type: 'line',
      name: 'Card Divider',
      bounds: { x, y: dividerRow, width, height: 1 },
      points: [
        { row: dividerRow, col: x },
        { row: dividerRow, col: maxC },
      ],
    });
  }

  return nodes;
}

function createCardResult(minR: number, minC: number, width: number, height: number): ToolResult {
  if (height < 3 || width < 6) return null;
  const { defaultTitle } = getCardSettings();
  const nodes = buildCardNodes(minC, minR, width, height, defaultTitle);
  return { kind: 'createMany', nodes, groupName: 'Card' };
}

export const cardTool: DrawingTool = {
  id: 'card',
  label: 'Card',
  icon: 'CreditCard',

  onClick(pos: GridPos): ToolResult {
    const { defaultWidth, defaultHeight } = getCardSettings();
    return createCardResult(pos.row, pos.col, defaultWidth, defaultHeight);
  },

  onDragStart() {
    return [];
  },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const { defaultTitle, defaultWidth, defaultHeight } = getCardSettings();
    if (start.row === current.row && start.col === current.col) {
      return buildCardPreview(start, { row: start.row + defaultHeight - 1, col: start.col + defaultWidth - 1 }, defaultTitle);
    }
    return buildCardPreview(start, current, defaultTitle);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    return createCardResult(minR, minC, maxC - minC + 1, maxR - minR + 1);
  },
};
