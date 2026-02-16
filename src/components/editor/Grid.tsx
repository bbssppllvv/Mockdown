'use client';

import { useCanvasRenderer } from '@/hooks/use-canvas-renderer';
import { useGridMouse } from '@/hooks/use-grid-mouse';
import { useEditorStore } from '@/hooks/use-editor-store';
import { MagicPrompt } from './MagicPrompt';
import { isInsideBounds, hitTestCornerHandle } from '@/lib/select-operations';

export function Grid() {
  const { canvasRef, cellSize } = useCanvasRenderer();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useGridMouse(
    cellSize.width,
    cellSize.height
  );
  const activeTool = useEditorStore((s) => s.activeTool);
  const selection = useEditorStore((s) => s.selection);
  const selectInteraction = useEditorStore((s) => s.selectInteraction);
  const hoverRow = useEditorStore((s) => s.hoverRow);
  const hoverCol = useEditorStore((s) => s.hoverCol);

  const getCursorStyle = () => {
    if (activeTool === 'select') {
      if (selectInteraction === 'moving') return 'move';
      if (selectInteraction === 'resizing') return 'nwse-resize';
      // Dynamic cursor based on hover position
      if (selection && hoverRow >= 0) {
        if (selection.type === 'box') {
          const corner = hitTestCornerHandle(hoverRow, hoverCol, selection.bounds);
          if (corner === 'top-left' || corner === 'bottom-right') return 'nwse-resize';
          if (corner === 'top-right' || corner === 'bottom-left') return 'nesw-resize';
        }
        if (isInsideBounds(hoverRow, hoverCol, selection.bounds)) return 'move';
      }
      return 'default';
    }
    if (activeTool === 'cursor') return 'text';
    if (activeTool === 'eraser') return 'cell';
    if (activeTool === 'magic') return 'crosshair';
    return 'crosshair';
  };

  return (
    <div className="relative overflow-auto flex-1 bg-white">
      <canvas ref={canvasRef} className="block" />
      <div
        className="absolute inset-0"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <MagicPrompt cellWidth={cellSize.width} cellHeight={cellSize.height} />
    </div>
  );
}
