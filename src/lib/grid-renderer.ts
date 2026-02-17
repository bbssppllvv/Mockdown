import { CharGrid } from './grid-model';
import {
  FONT_FAMILY,
  FONT_SIZE,
  LIGHT_COLORS,
  ThemeColors,
} from './constants';
export interface SelectionRect {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  showGridLines: boolean;
}

export interface CursorPos {
  row: number;
  col: number;
}

export interface PreviewCell {
  row: number;
  col: number;
  char: string;
}

export function measureCellSize(ctx: CanvasRenderingContext2D): {
  width: number;
  height: number;
} {
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  const metrics = ctx.measureText('M');
  const width = metrics.width;
  const height = FONT_SIZE * 1.3;
  return { width, height };
}

export interface GenerateSelectionRect {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: CharGrid,
  config: RenderConfig,
  cursor: CursorPos | null,
  preview: PreviewCell[] | null,
  cursorVisible: boolean,
  hoverPos: CursorPos | null = null,
  generateSelection: GenerateSelectionRect | null = null,
  selection: SelectionRect | null = null,
  colors: ThemeColors = LIGHT_COLORS
): void {
  const { cellWidth, cellHeight, showGridLines } = config;
  const totalWidth = grid.cols * cellWidth;
  const totalHeight = grid.rows * cellHeight;
  const a = colors.accentRgb;
  // Opacity multiplier: dark backgrounds need stronger overlays to be visible
  const om = colors.dark ? 2 : 1;

  // Background
  ctx.fillStyle = colors.gridBg;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Grid lines
  if (showGridLines) {
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 0; c <= grid.cols; c++) {
      const x = c * cellWidth;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
    }
    for (let r = 0; r <= grid.rows; r++) {
      const y = r * cellHeight;
      ctx.moveTo(0, y);
      ctx.lineTo(totalWidth, y);
    }
    ctx.stroke();
  }

  // Characters
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.fillStyle = colors.char;
  ctx.textBaseline = 'middle';
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const ch = grid.getChar(r, c);
      if (ch !== ' ') {
        const x = c * cellWidth + cellWidth * 0.1;
        const y = r * cellHeight + cellHeight / 2;
        ctx.fillText(ch, x, y);
      }
    }
  }

  // Ghost shadow preview
  if (preview && preview.length > 0) {
    const isErase = preview.every((c) => c.char === ' ');

    const tintBg = isErase ? `rgba(239, 68, 68, ${0.08 * om})` : `rgba(${a}, ${0.06 * om})`;
    const tintBorder = isErase ? `rgba(239, 68, 68, ${0.4 * om})` : `rgba(${a}, ${0.3 * om})`;
    const tintChar = isErase ? `rgba(239, 68, 68, ${0.55 * om})` : `rgba(${a}, ${0.45 * om})`;

    let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
    for (const cell of preview) {
      if (cell.row < minRow) minRow = cell.row;
      if (cell.row > maxRow) maxRow = cell.row;
      if (cell.col < minCol) minCol = cell.col;
      if (cell.col > maxCol) maxCol = cell.col;
    }

    const rx = minCol * cellWidth;
    const ry = minRow * cellHeight;
    const rw = (maxCol - minCol + 1) * cellWidth;
    const rh = (maxRow - minRow + 1) * cellHeight;

    ctx.fillStyle = tintBg;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.save();
    ctx.strokeStyle = tintBorder;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    ctx.restore();

    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    for (const cell of preview) {
      if (cell.char !== ' ') {
        const x = cell.col * cellWidth + cellWidth * 0.1;
        const y = cell.row * cellHeight + cellHeight / 2;
        ctx.fillStyle = tintChar;
        ctx.fillText(cell.char, x, y);
      }
    }

    if (isErase) {
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 * om})`;
      ctx.lineWidth = 1;
      for (const cell of preview) {
        const existing = grid.getChar(cell.row, cell.col);
        if (existing !== ' ') {
          const x = cell.col * cellWidth;
          const y = cell.row * cellHeight + cellHeight / 2;
          ctx.beginPath();
          ctx.moveTo(x + 1, y);
          ctx.lineTo(x + cellWidth - 1, y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // Hover highlight
  if (hoverPos && hoverPos.row >= 0 && hoverPos.row < grid.rows && hoverPos.col >= 0 && hoverPos.col < grid.cols) {
    ctx.fillStyle = `rgba(${a}, ${0.06 * om})`;
    ctx.fillRect(
      hoverPos.col * cellWidth,
      hoverPos.row * cellHeight,
      cellWidth,
      cellHeight
    );
  }

  // Generate selection highlight
  if (generateSelection) {
    const mx = generateSelection.minCol * cellWidth;
    const my = generateSelection.minRow * cellHeight;
    const mw = (generateSelection.maxCol - generateSelection.minCol + 1) * cellWidth;
    const mh = (generateSelection.maxRow - generateSelection.minRow + 1) * cellHeight;

    ctx.fillStyle = `rgba(${a}, ${0.06 * om})`;
    ctx.fillRect(mx, my, mw, mh);

    ctx.save();
    ctx.strokeStyle = `rgba(${a}, ${0.5 * om})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.restore();
  }

  // Object selection highlight (select tool)
  if (selection) {
    const sx = selection.minCol * cellWidth;
    const sy = selection.minRow * cellHeight;
    const sw = (selection.maxCol - selection.minCol + 1) * cellWidth;
    const sh = (selection.maxRow - selection.minRow + 1) * cellHeight;

    // Blue tint background
    ctx.fillStyle = `rgba(${a}, ${0.08 * om})`;
    ctx.fillRect(sx, sy, sw, sh);

    // Solid blue border (not dashed — distinguishes from generate selection)
    ctx.save();
    ctx.strokeStyle = `rgba(${a}, ${0.6 * om})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
    ctx.restore();

    // Corner handles for all selection types
    {
      const handleSize = 6;
      const half = handleSize / 2;
      ctx.fillStyle = `rgba(${a}, 0.9)`;

      const corners = [
        { x: sx, y: sy },                     // top-left
        { x: sx + sw, y: sy },                // top-right
        { x: sx, y: sy + sh },                // bottom-left
        { x: sx + sw, y: sy + sh },           // bottom-right
      ];

      for (const corner of corners) {
        ctx.fillRect(corner.x - half, corner.y - half, handleSize, handleSize);
      }
    }
  }

  // Cursor — blinking beam
  if (cursor && cursorVisible && cursor.row >= 0 && cursor.row < grid.rows && cursor.col >= 0 && cursor.col < grid.cols) {
    const cx = cursor.col * cellWidth;
    const cy = cursor.row * cellHeight + 2;
    const ch = cellHeight - 4;
    ctx.fillStyle = colors.cursor;
    ctx.fillRect(cx, cy, 2, ch);
  }
}
