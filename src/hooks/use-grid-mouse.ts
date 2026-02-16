import { useEditorStore } from './use-editor-store';
import { getTool } from '@/components/tools/registry';
import { CharGrid } from '@/lib/grid-model';
import { detectObjectAt } from '@/lib/object-detection';
import {
  isInsideBounds,
  hitTestCornerHandle,
  buildMovePreview,
  applyMove,
  computeResizedBounds,
  buildResizePreview,
  applyResize,
} from '@/lib/select-operations';

export function pixelToGrid(
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
  maxRows: number,
  maxCols: number
): { row: number; col: number } {
  const col = Math.max(0, Math.min(Math.floor(x / cellWidth), maxCols - 1));
  const row = Math.max(0, Math.min(Math.floor(y / cellHeight), maxRows - 1));
  return { row, col };
}

function getPos(e: React.MouseEvent<HTMLDivElement>, cellWidth: number, cellHeight: number) {
  const rect = e.currentTarget.getBoundingClientRect();
  const s = useEditorStore.getState();
  return pixelToGrid(
    e.clientX - rect.left,
    e.clientY - rect.top,
    cellWidth,
    cellHeight,
    s.grid.rows,
    s.grid.cols
  );
}

// Detect if clicked cell is part of a toggleable checkbox [ ]/[x] or radio ( )/(*)
function detectToggle(grid: CharGrid, row: number, col: number): { row: number; col: number; char: string } | null {
  for (let offset = -2; offset <= 0; offset++) {
    const sc = col + offset;
    if (sc < 0 || sc + 2 >= grid.cols) continue;
    const c0 = grid.getChar(row, sc);
    const c1 = grid.getChar(row, sc + 1);
    const c2 = grid.getChar(row, sc + 2);
    if (c0 === '[' && c2 === ']') {
      if (c1 === ' ') return { row, col: sc + 1, char: 'x' };
      if (c1 === 'x') return { row, col: sc + 1, char: ' ' };
    }
    if (c0 === '(' && c2 === ')') {
      if (c1 === ' ') return { row, col: sc + 1, char: '*' };
      if (c1 === '*') return { row, col: sc + 1, char: ' ' };
    }
  }
  return null;
}

// Detect widget at position for double-click label editing
function detectWidget(grid: CharGrid, row: number, col: number): {
  contentStart: number; oldEnd: number; suffix: string;
} | null {
  // Scan left for opening bracket
  let openCol = col;
  while (openCol > 0 && grid.getChar(row, openCol) !== '[' && grid.getChar(row, openCol) !== '(') {
    openCol--;
  }
  const openChar = grid.getChar(row, openCol);
  if (openChar !== '[' && openChar !== '(') return null;

  // Radio: ( ) Label or (*) Label
  if (openChar === '(' && openCol + 2 < grid.cols && grid.getChar(row, openCol + 2) === ')') {
    const labelStart = openCol + 4;
    if (labelStart >= grid.cols) return null;
    let labelEnd = labelStart;
    while (labelEnd < grid.cols && grid.getChar(row, labelEnd) !== ' ' || (labelEnd < grid.cols && grid.getChar(row, labelEnd + 1) !== ' ' && grid.getChar(row, labelEnd) === ' ')) {
      labelEnd++;
    }
    // Find last non-space from labelStart
    let end = labelStart;
    for (let c = labelStart; c < grid.cols; c++) {
      if (grid.getChar(row, c) !== ' ') end = c;
    }
    return { contentStart: labelStart, oldEnd: end, suffix: '' };
  }

  // Checkbox: [ ] Label or [x] Label
  if (openChar === '[' && openCol + 2 < grid.cols) {
    const c1 = grid.getChar(row, openCol + 1);
    const c2 = grid.getChar(row, openCol + 2);
    if ((c1 === ' ' || c1 === 'x') && c2 === ']') {
      const labelStart = openCol + 4;
      if (labelStart >= grid.cols) return null;
      let end = labelStart;
      for (let c = labelStart; c < grid.cols; c++) {
        if (grid.getChar(row, c) !== ' ') end = c;
      }
      return { contentStart: labelStart, oldEnd: end, suffix: '' };
    }
  }

  // Scan right for closing ]
  let closeCol = openCol + 1;
  while (closeCol < grid.cols && grid.getChar(row, closeCol) !== ']') {
    closeCol++;
  }
  if (closeCol >= grid.cols) return null;

  // Dropdown: [v Label ]
  if (grid.getChar(row, openCol + 1) === 'v') {
    return { contentStart: openCol + 3, oldEnd: closeCol, suffix: ' ]' };
  }

  // Button: [ Label ]
  return { contentStart: openCol + 2, oldEnd: closeCol, suffix: ' ]' };
}

export function useGridMouse(cellWidth: number, cellHeight: number) {
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const s = useEditorStore.getState();

    // If magic prompt is open, clicking on grid dismisses it
    if (s.magicSelection) {
      s.clearMagic();
      return;
    }

    const pos = getPos(e, cellWidth, cellHeight);

    if (s.textInputActive) {
      s.finalizeLabelEdit();
      s.setTextInputActive(false);
    }

    s.setCursor(pos.row, pos.col);

    // Select tool
    if (s.activeTool === 'select') {
      // If we have a selection, check if clicking on corner handle (box only) or inside bounds
      if (s.selection) {
        // Check corner handles first (box only)
        if (s.selection.type === 'box') {
          const corner = hitTestCornerHandle(pos.row, pos.col, s.selection.bounds);
          if (corner) {
            s.pushUndo();
            s.setSelectInteraction('resizing');
            s.setSelectDragStart(pos);
            s.setSelectOriginalBounds({ ...s.selection.bounds });
            s.setResizeCorner(corner);
            return;
          }
        }

        // Check if clicking inside the selection bounds
        if (isInsideBounds(pos.row, pos.col, s.selection.bounds)) {
          s.pushUndo();
          s.setSelectInteraction('moving');
          s.setSelectDragStart(pos);
          s.setSelectOriginalBounds({ ...s.selection.bounds });
          return;
        }
      }

      // Otherwise try to detect an object at click position
      const detected = detectObjectAt(s.grid, pos.row, pos.col);
      if (detected) {
        s.setSelection({ bounds: detected.bounds, type: detected.type });
      } else {
        s.clearSelection();
      }
      return;
    }

    // Cursor tool = text mode
    if (s.activeTool === 'cursor') {
      // Check for checkbox/radio toggle (click on the [ ]/( ) marker itself)
      const toggle = detectToggle(s.grid, pos.row, pos.col);
      if (toggle) {
        s.pushUndo();
        s.applyChars([toggle]);
        return;
      }

      // Check if clicking inside a widget label — enter label edit mode
      const widget = detectWidget(s.grid, pos.row, pos.col);
      if (widget) {
        s.pushUndo();
        for (let c = widget.contentStart; c <= widget.oldEnd; c++) {
          if (c < s.grid.cols) s.grid.setChar(pos.row, c, ' ');
        }
        s.applyChars([]);
        s.setCursor(pos.row, widget.contentStart);
        s.setLabelEdit({ row: pos.row, ...widget });
        s.setTextInputActive(true, { row: pos.row, col: widget.contentStart });
      }
      return;
    }

    const tool = getTool(s.activeTool);

    // Drag tools (box, line, arrow, eraser)
    if (tool.onDragEnd) {
      s.setIsDrawing(true);
      s.setDrawStart(pos);
      if (tool.onDragStart) {
        s.setPreview(tool.onDragStart(pos, s.grid));
      }
      return;
    }

    // Click-to-place tools (button, checkbox, radio, input, dropdown)
    if (tool.onClick) {
      s.pushUndo();
      const result = tool.onClick(pos, s.grid);
      if (result && result.chars.length > 0) {
        s.applyChars(result.chars);
      }
      s.setPreview(null);
      if (tool.needsTextInput) {
        s.setTextInputActive(true, pos);
      }
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const s = useEditorStore.getState();
    const pos = getPos(e, cellWidth, cellHeight);

    s.setHover(pos.row, pos.col);

    // Select tool move/resize
    if (s.activeTool === 'select') {
      if (s.selectInteraction === 'moving' && s.selectDragStart && s.selectOriginalBounds) {
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        const preview = buildMovePreview(s.grid, s.selectOriginalBounds, dRow, dCol);
        s.setPreview(preview);
        return;
      }
      if (s.selectInteraction === 'resizing' && s.selectDragStart && s.selectOriginalBounds && s.resizeCorner) {
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        const newBounds = computeResizedBounds(s.selectOriginalBounds, s.resizeCorner, dRow, dCol);
        const preview = buildResizePreview(s.grid, s.selectOriginalBounds, newBounds);
        s.setPreview(preview);
        return;
      }
      if (s.preview) s.setPreview(null);
      return;
    }

    // Cursor tool = no previews
    if (s.activeTool === 'cursor') {
      if (s.preview) s.setPreview(null);
      return;
    }

    const tool = getTool(s.activeTool);

    if (s.isDrawing && s.drawStart && tool.onDrag) {
      s.setPreview(tool.onDrag(s.drawStart, pos, s.grid));
    } else if (!s.isDrawing && tool.onClick && !tool.onDragEnd) {
      // Hover ghost for click-to-place tools
      const result = tool.onClick(pos, s.grid);
      s.setPreview(result && result.chars.length > 0 ? result.chars : null);
    } else if (!s.isDrawing) {
      if (s.preview) s.setPreview(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const s = useEditorStore.getState();

    // Select tool: finalize move/resize
    if (s.activeTool === 'select' && s.selectInteraction !== 'idle' && s.selectDragStart && s.selectOriginalBounds) {
      const pos = getPos(e, cellWidth, cellHeight);

      if (s.selectInteraction === 'moving') {
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        if (dRow !== 0 || dCol !== 0) {
          const newBounds = applyMove(s.grid, s.selectOriginalBounds, dRow, dCol);
          // Trigger re-render
          s.applyChars([]);
          s.setSelection({ bounds: newBounds, type: s.selection!.type });
        }
      } else if (s.selectInteraction === 'resizing' && s.resizeCorner) {
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        if (dRow !== 0 || dCol !== 0) {
          const newBounds = computeResizedBounds(s.selectOriginalBounds, s.resizeCorner, dRow, dCol);
          const finalBounds = applyResize(s.grid, s.selectOriginalBounds, newBounds);
          s.applyChars([]);
          s.setSelection({ bounds: finalBounds, type: s.selection!.type });
        }
      }

      s.setSelectInteraction('idle');
      s.setSelectDragStart(null);
      s.setSelectOriginalBounds(null);
      s.setResizeCorner(null);
      s.setPreview(null);
      return;
    }

    if (s.isDrawing && s.drawStart) {
      const pos = getPos(e, cellWidth, cellHeight);
      const tool = getTool(s.activeTool);

      // Magic tool: store selection instead of applying chars
      if (s.activeTool === 'magic') {
        const minR = Math.min(s.drawStart.row, pos.row);
        const maxR = Math.max(s.drawStart.row, pos.row);
        const minC = Math.min(s.drawStart.col, pos.col);
        const maxC = Math.max(s.drawStart.col, pos.col);
        if (maxR - minR >= 1 && maxC - minC >= 2) {
          s.setMagicSelection({ minRow: minR, maxRow: maxR, minCol: minC, maxCol: maxC });
        }
        s.setIsDrawing(false);
        s.setDrawStart(null);
        s.setPreview(null);
        return;
      }

      if (tool.onDragEnd) {
        s.pushUndo();
        const result = tool.onDragEnd(s.drawStart, pos, s.grid);
        if (result) s.applyChars(result.chars);
      }

      s.setIsDrawing(false);
      s.setDrawStart(null);
      s.setPreview(null);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    useEditorStore.getState().setHover(-1, -1);
    useEditorStore.getState().setPreview(null);
    handleMouseUp(e);
  };

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave };
}
