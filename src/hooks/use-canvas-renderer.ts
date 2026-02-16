import { useRef, useEffect, useState, useCallback } from 'react';
import { drawGrid, measureCellSize, RenderConfig } from '@/lib/grid-renderer';
import { useEditorStore } from './use-editor-store';
import { FONT_FAMILY, FONT_SIZE, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT } from '@/lib/constants';

export function useCanvasRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cellSize, setCellSize] = useState({ width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT });
  const [cursorVisible, setCursorVisible] = useState(true);
  const blinkRef = useRef<ReturnType<typeof setInterval>>(null);

  const store = useEditorStore();

  // Measure cell size once font is loaded
  useEffect(() => {
    const measure = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = measureCellSize(ctx);
      setCellSize(size);
    };

    if (document.fonts) {
      document.fonts.ready.then(() => {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
          const size = measureCellSize(ctx);
          setCellSize(size);
        }
      });
    }

    const timer = setTimeout(measure, 200);
    return () => clearTimeout(timer);
  }, []);

  // Cursor blink (530ms on/off like most editors)
  useEffect(() => {
    blinkRef.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => { if (blinkRef.current) clearInterval(blinkRef.current); };
  }, []);

  // Reset blink on cursor move (always show immediately after move)
  const cursorRow = store.cursorRow;
  const cursorCol = store.cursorCol;
  useEffect(() => {
    setCursorVisible(true);
    if (blinkRef.current) clearInterval(blinkRef.current);
    blinkRef.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => { if (blinkRef.current) clearInterval(blinkRef.current); };
  }, [cursorRow, cursorCol]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const config: RenderConfig = {
      cellWidth: cellSize.width,
      cellHeight: cellSize.height,
      showGridLines: store.showGridLines,
    };

    const totalWidth = store.grid.cols * config.cellWidth;
    const totalHeight = store.grid.rows * config.cellHeight;

    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);

    const cursor = { row: store.cursorRow, col: store.cursorCol };
    const hover = store.hoverRow >= 0 ? { row: store.hoverRow, col: store.hoverCol } : null;
    drawGrid(ctx, store.grid, config, cursor, store.preview, cursorVisible, hover, store.magicSelection, store.selection);
  }, [store.grid, store.cursorRow, store.cursorCol, store.hoverRow, store.hoverCol, store.preview, store.showGridLines, store.magicSelection, store.selection, cellSize, cursorVisible]);

  // Re-render on state changes
  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  return { canvasRef, cellSize };
}
