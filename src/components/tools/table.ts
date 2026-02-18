import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { BOX } from '@/lib/box-chars';
import { useSceneStore } from '@/hooks/use-scene-store';

function getTableSettings() {
  return useSceneStore.getState().toolSettings.table;
}

function parseColumns(csv: string): string[] {
  return csv.split(',').map(s => s.trim()).filter(Boolean);
}

function buildTablePreview(start: GridPos, end: GridPos): PreviewCell[] {
  const minR = Math.min(start.row, end.row);
  const maxR = Math.max(start.row, end.row);
  const minC = Math.min(start.col, end.col);
  const maxC = Math.max(start.col, end.col);
  const h = maxR - minR;
  const w = maxC - minC;
  if (h < 2 || w < 7) return [];

  const { defaultColumns } = getTableSettings();
  const labels = parseColumns(defaultColumns);

  const cols = w < 15 ? 2 : w < 30 ? 3 : 4;
  const colPositions: number[] = [minC];
  for (let i = 1; i < cols; i++) colPositions.push(minC + Math.round((w * i) / cols));
  colPositions.push(maxC);

  const sepR = minR + 2;
  const hasSep = sepR < maxR;
  const cells: PreviewCell[] = [];

  for (let r = minR; r <= maxR; r++) {
    const isTop = r === minR;
    const isBot = r === maxR;
    const isSep = hasSep && r === sepR;
    for (let c = minC; c <= maxC; c++) {
      const isLeft = c === minC;
      const isRight = c === maxC;
      const isColBoundary = colPositions.includes(c) && !isLeft && !isRight;
      if (isTop) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.TL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.TR });
        else if (isColBoundary) cells.push({ row: r, col: c, char: BOX.T_DOWN });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isBot) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.BL });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.BR });
        else if (isColBoundary) cells.push({ row: r, col: c, char: BOX.T_UP });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else if (isSep) {
        if (isLeft) cells.push({ row: r, col: c, char: BOX.T_RIGHT });
        else if (isRight) cells.push({ row: r, col: c, char: BOX.T_LEFT });
        else if (isColBoundary) cells.push({ row: r, col: c, char: BOX.CROSS });
        else cells.push({ row: r, col: c, char: BOX.H });
      } else {
        if (isColBoundary || isLeft || isRight) cells.push({ row: r, col: c, char: BOX.V });
        else cells.push({ row: r, col: c, char: ' ' });
      }
    }
  }

  if (h >= 2) {
    const headerR = minR + 1;
    for (let i = 0; i < cols; i++) {
      const cStart = colPositions[i] + 2;
      const cEnd = colPositions[i + 1];
      const label = labels[i] ?? `Col ${String.fromCharCode(65 + i)}`;
      for (let j = 0; j < label.length && cStart + j < cEnd; j++) {
        const idx = cells.findIndex(cell => cell.row === headerR && cell.col === cStart + j);
        if (idx !== -1) cells[idx].char = label[j];
        else cells.push({ row: headerR, col: cStart + j, char: label[j] });
      }
    }
  }

  return cells;
}

export const tableTool: DrawingTool = {
  id: 'table',
  label: 'Table',
  icon: 'Table',

  onClick(pos: GridPos): ToolResult {
    const { defaultColumns, defaultColWidth } = getTableSettings();
    const columns = parseColumns(defaultColumns);
    const colWidth = defaultColWidth;
    const totalWidth = columns.length * colWidth + 1;
    return {
      kind: 'create',
      node: {
        type: 'table',
        name: 'Table',
        bounds: { x: pos.col, y: pos.row, width: totalWidth, height: 6 },
        columns,
        columnWidths: columns.map(() => colWidth),
        rowCount: 3,
      },
    };
  },

  onDragStart(_pos: GridPos) { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const { defaultColumns, defaultColWidth } = getTableSettings();
    const columns = parseColumns(defaultColumns);
    const defaultW = columns.length * defaultColWidth;
    if (start.row === current.row && start.col === current.col) {
      return buildTablePreview(start, { row: start.row + 5, col: start.col + defaultW });
    }
    return buildTablePreview(start, current);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const w = maxC - minC;
    if (maxR - minR < 2 || w < 7) return null;

    const { defaultColumns } = getTableSettings();
    const allColumns = parseColumns(defaultColumns);

    const colCount = w < 15 ? 2 : w < 30 ? 3 : 4;
    const columns = allColumns.length >= colCount
      ? allColumns.slice(0, colCount)
      : Array.from({ length: colCount }, (_, i) => allColumns[i] ?? `Col ${String.fromCharCode(65 + i)}`);
    const colWidth = Math.round(w / colCount);
    const columnWidths = Array(colCount).fill(colWidth);

    return {
      kind: 'create',
      node: {
        type: 'table',
        name: 'Table',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        columns,
        columnWidths,
        rowCount: Math.max(1, maxR - minR - 2),
      },
    };
  },
};
