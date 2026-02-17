import { useRef, useEffect, useState, useCallback } from 'react';
import { drawGrid, measureCellSize, RenderConfig, SelectionRect } from '@/lib/grid-renderer';
import { useEditorStore } from './use-editor-store';
import { FONT_FAMILY, FONT_SIZE, DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT, LIGHT_COLORS, DARK_COLORS } from '@/lib/constants';

export function useCanvasRenderer(containerRef: React.RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cellSize, setCellSize] = useState({ width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT });
  const cursorVisibleRef = useRef(true);
  const blinkRef = useRef<ReturnType<typeof setInterval>>(null);
  const rafRef = useRef(0);
  const lastDimsRef = useRef({ width: 0, height: 0 });
  const cellSizeRef = useRef(cellSize);
  const containerSizeRef = useRef({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // Keep cellSizeRef in sync
  cellSizeRef.current = cellSize;

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

  // Stable render function - reads ALL state from store/refs, zero reactive deps
  const doRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const store = useEditorStore.getState();
    const dpr = window.devicePixelRatio || 1;
    const grid = store.renderedGrid;
    const cs = cellSizeRef.current;
    const config: RenderConfig = {
      cellWidth: cs.width,
      cellHeight: cs.height,
      showGridLines: store.showGridLines,
    };

    const gridWidth = grid.cols * config.cellWidth;
    const gridHeight = grid.rows * config.cellHeight;
    // Expand canvas to fill the container viewport
    const cSize = containerSizeRef.current;
    const totalWidth = Math.max(gridWidth, cSize.width);
    const totalHeight = Math.max(gridHeight, cSize.height);
    const pxW = Math.round(totalWidth * dpr);
    const pxH = Math.round(totalHeight * dpr);

    // 1.1: Only resize canvas when dimensions actually change
    if (lastDimsRef.current.width !== pxW || lastDimsRef.current.height !== pxH) {
      canvas.width = pxW;
      canvas.height = pxH;
      canvas.style.width = `${totalWidth}px`;
      canvas.style.height = `${totalHeight}px`;
      lastDimsRef.current = { width: pxW, height: pxH };
    }

    // 1.1: setTransform is idempotent (doesn't compound like scale())
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fill full canvas background (canvas may be larger than grid)
    const themeColors = store.theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
    ctx.fillStyle = themeColors.gridBg;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Compute selection rect from selectedIds
    let selectionRect: SelectionRect | null = null;
    if (store.selectedIds.length > 0) {
      let minRow = Infinity, maxRow = -Infinity, minCol = Infinity, maxCol = -Infinity;
      for (const id of store.selectedIds) {
        const node = store.document.nodes.get(id);
        if (!node) continue;
        minRow = Math.min(minRow, node.bounds.y);
        maxRow = Math.max(maxRow, node.bounds.y + node.bounds.height - 1);
        minCol = Math.min(minCol, node.bounds.x);
        maxCol = Math.max(maxCol, node.bounds.x + node.bounds.width - 1);
      }
      if (minRow <= maxRow) selectionRect = { minRow, maxRow, minCol, maxCol };
    }

    const cursor = { row: store.cursorRow, col: store.cursorCol };
    const hover = store.hoverRow >= 0 ? { row: store.hoverRow, col: store.hoverCol } : null;
    drawGrid(ctx, grid, config, cursor, store.preview, cursorVisibleRef.current, hover, store.generateSelection, selectionRect, themeColors);
  }, []); // stable - reads from refs and getState()

  // 1.2: Schedule a single RAF (coalesces multiple state changes into one frame)
  const scheduleRender = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      doRender();
    });
  }, [doRender]);

  // Cursor blink - toggles a ref, schedules render (no state change = no callback recreation)
  useEffect(() => {
    blinkRef.current = setInterval(() => {
      cursorVisibleRef.current = !cursorVisibleRef.current;
      scheduleRender();
    }, 530);
    return () => { if (blinkRef.current) clearInterval(blinkRef.current); };
  }, [scheduleRender]);

  // Reset blink on cursor move (always show immediately after move)
  useEffect(() => {
    let lastRow = -1, lastCol = -1;
    return useEditorStore.subscribe((state) => {
      if (state.cursorRow !== lastRow || state.cursorCol !== lastCol) {
        lastRow = state.cursorRow;
        lastCol = state.cursorCol;
        cursorVisibleRef.current = true;
        if (blinkRef.current) clearInterval(blinkRef.current);
        blinkRef.current = setInterval(() => {
          cursorVisibleRef.current = !cursorVisibleRef.current;
          scheduleRender();
        }, 530);
      }
    });
  }, [scheduleRender]);

  // 3.3: Compute responsive scale for mobile viewports
  useEffect(() => {
    const computeScale = () => {
      const s = useEditorStore.getState();
      const cs = cellSizeRef.current;
      const gridPixelWidth = s.document.gridCols * cs.width;
      const gridPixelHeight = s.document.gridRows * cs.height;
      // Account for sidebar (192px on md+, 0 on mobile since it's an overlay)
      const isMobile = window.innerWidth < 768;
      const availableWidth = isMobile ? window.innerWidth - 16 : window.innerWidth - 192;
      // On mobile, subtract bottom toolbar (88px two rows) + safe area estimate (~34px)
      const availableHeight = isMobile
        ? window.innerHeight - 122
        : window.innerHeight;
      // On mobile, don't scale down for width — allow horizontal overflow/scroll
      const scaleX = !isMobile && availableWidth < gridPixelWidth && gridPixelWidth > 0
        ? availableWidth / gridPixelWidth
        : 1;
      const scaleY = isMobile && availableHeight < gridPixelHeight && gridPixelHeight > 0
        ? availableHeight / gridPixelHeight
        : 1;
      setScale(Math.max(0.25, Math.min(scaleX, scaleY)));
    };
    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, []);

  // Track container size so canvas fills the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerSizeRef.current = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        lastDimsRef.current = { width: 0, height: 0 }; // force canvas resize
        scheduleRender();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, scheduleRender]);

  // 1.2: Subscribe to store changes and schedule render (replaces the useEffect+[render] pattern)
  useEffect(() => {
    scheduleRender(); // initial render
    const unsub = useEditorStore.subscribe(() => {
      scheduleRender();
    });
    return () => {
      unsub();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleRender]);

  // Re-schedule render when cellSize changes
  useEffect(() => {
    lastDimsRef.current = { width: 0, height: 0 }; // force resize
    scheduleRender();
  }, [cellSize, scheduleRender]);

  return { canvasRef, cellSize, scale };
}
