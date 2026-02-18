import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { BOX } from '@/lib/box-chars';
import { NewNodeData } from '@/lib/scene/types';
import { useSceneStore } from '@/hooks/use-scene-store';

function getDefaultModalConfig() {
  const settings = useSceneStore.getState().toolSettings.modal;
  return {
    width: Math.max(12, Math.min(120, settings.defaultWidth)),
    height: Math.max(6, Math.min(80, settings.defaultHeight)),
    title: settings.defaultTitle || 'Dialog',
  };
}

function buildModalPreview(start: GridPos, end: GridPos, title: string): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  const h = maxR - minR;
  const w = maxC - minC;
  if (h < 3 || w < 9) return [];

  const cells: PreviewCell[] = [];

  for (let r = minR; r <= maxR; r++) {
    const isTop = r === minR;
    const isBot = r === maxR;
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
      } else {
        if (isLeft || isRight) cells.push({ row: r, col: c, char: BOX.V });
        else cells.push({ row: r, col: c, char: ' ' });
      }
    }
  }

  for (let i = 0; i < title.length && minC + 2 + i < maxC - 2; i++) {
    const idx = cells.findIndex(c => c.row === minR + 1 && c.col === minC + 2 + i);
    if (idx !== -1) cells[idx].char = title[i];
  }

  if (w >= 5) {
    const idx = cells.findIndex(c => c.row === minR + 1 && c.col === maxC - 2);
    if (idx !== -1) cells[idx].char = '×';
  }

  if (minR + 2 < maxR) {
    const leftIdx = cells.findIndex(c => c.row === minR + 2 && c.col === minC);
    if (leftIdx !== -1) cells[leftIdx].char = BOX.T_RIGHT;
    const rightIdx = cells.findIndex(c => c.row === minR + 2 && c.col === maxC);
    if (rightIdx !== -1) cells[rightIdx].char = BOX.T_LEFT;
    for (let c = minC + 1; c < maxC; c++) {
      const idx = cells.findIndex(cell => cell.row === minR + 2 && cell.col === c);
      if (idx !== -1) cells[idx].char = BOX.H;
    }
  }

  const btnRow = maxR - 1;
  if (btnRow > minR + 2) {
    const btns = '[ Cancel ] [ OK ]';
    const btnStart = maxC - 1 - btns.length;
    if (btnStart > minC) {
      for (let i = 0; i < btns.length; i++) {
        const idx = cells.findIndex(c => c.row === btnRow && c.col === btnStart + i);
        if (idx !== -1) cells[idx].char = btns[i];
      }
    }
  }

  return cells;
}

function buildModalNodes(x: number, y: number, width: number, height: number, title: string): NewNodeData[] {
  const maxC = x + width - 1;
  const maxR = y + height - 1;
  const titleX = x + 2;
  const titleRow = y + 1;
  const dividerRow = y + 2;
  const actionRow = maxR - 1;

  const nodes: NewNodeData[] = [
    {
      type: 'box',
      name: 'Dialog Frame',
      bounds: { x, y, width, height },
    },
  ];

  if (titleRow <= maxR - 1) {
    const titleMaxWidth = Math.max(1, maxC - titleX - 2);
    nodes.push({
      type: 'text',
      name: 'Dialog Title',
      bounds: { x: titleX, y: titleRow, width: Math.min(title.length, titleMaxWidth), height: 1 },
      content: title,
    });
    nodes.push({
      type: 'text',
      name: 'Dialog Close',
      bounds: { x: maxC - 2, y: titleRow, width: 1, height: 1 },
      content: '×',
    });
  }

  if (dividerRow < maxR) {
    nodes.push({
      type: 'line',
      name: 'Dialog Divider',
      bounds: { x, y: dividerRow, width, height: 1 },
      points: [
        { row: dividerRow, col: x },
        { row: dividerRow, col: maxC },
      ],
    });
  }

  if (actionRow > dividerRow) {
    const okLabel = 'OK';
    const cancelLabel = 'Cancel';
    const okWidth = okLabel.length + 4;
    const cancelWidth = cancelLabel.length + 4;
    const okX = maxC - 1 - okWidth;
    const cancelX = okX - 1 - cancelWidth;

    if (cancelX > x) {
      nodes.push({
        type: 'button',
        name: 'Dialog Cancel',
        bounds: { x: cancelX, y: actionRow, width: cancelWidth, height: 1 },
        label: cancelLabel,
      });
    }

    if (okX > x) {
      nodes.push({
        type: 'button',
        name: 'Dialog OK',
        bounds: { x: okX, y: actionRow, width: okWidth, height: 1 },
        label: okLabel,
      });
    }
  }

  return nodes;
}

function createModalResult(minR: number, minC: number, width: number, height: number): ToolResult {
  if (height < 4 || width < 10) return null;
  const { title } = getDefaultModalConfig();
  const nodes = buildModalNodes(minC, minR, width, height, title);
  return { kind: 'createMany', nodes, groupName: 'Modal' };
}

export const modalTool: DrawingTool = {
  id: 'modal',
  label: 'Modal',
  icon: 'AppWindow',

  onClick(pos: GridPos): ToolResult {
    const defaults = getDefaultModalConfig();
    return createModalResult(pos.row, pos.col, defaults.width, defaults.height);
  },

  onDragStart() {
    return [];
  },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const defaults = getDefaultModalConfig();
    if (start.row === current.row && start.col === current.col) {
      return buildModalPreview(
        start,
        { row: start.row + defaults.height - 1, col: start.col + defaults.width - 1 },
        defaults.title
      );
    }
    return buildModalPreview(start, current, defaults.title);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    return createModalResult(minR, minC, maxC - minC + 1, maxR - minR + 1);
  },
};
