'use client';

import { useCanvasRenderer } from '@/hooks/use-canvas-renderer';
import { useGridMouse } from '@/hooks/use-grid-mouse';
import { useEditorStore } from '@/hooks/use-editor-store';
import { GeneratePrompt } from './GeneratePrompt';
import { hitTestCornerHandle, isInsideNodeBounds } from '@/lib/scene/hit-test';

export function Grid() {
  const { canvasRef, cellSize } = useCanvasRenderer();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useGridMouse(
    cellSize.width,
    cellSize.height
  );
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectInteraction = useEditorStore((s) => s.selectInteraction);
  const hoverRow = useEditorStore((s) => s.hoverRow);
  const hoverCol = useEditorStore((s) => s.hoverCol);
  const doc = useEditorStore((s) => s.document);

  const getCursorStyle = () => {
    if (activeTool === 'select') {
      if (selectInteraction === 'moving') return 'move';
      if (selectInteraction === 'resizing') return 'nwse-resize';
      if (selectedIds.length > 0 && hoverRow >= 0) {
        for (const id of selectedIds) {
          const corner = hitTestCornerHandle(doc, id, hoverRow, hoverCol);
          if (corner === 'top-left' || corner === 'bottom-right') return 'nwse-resize';
          if (corner === 'top-right' || corner === 'bottom-left') return 'nesw-resize';
        }
        for (const id of selectedIds) {
          if (isInsideNodeBounds(doc, id, hoverRow, hoverCol)) return 'move';
        }
      }
      return 'default';
    }
    return 'crosshair';
  };

  return (
    <div className="relative overflow-auto flex-1 bg-white dark:bg-[#1a1a1a]">
      <canvas ref={canvasRef} className="block" />
      <div
        className="absolute inset-0"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <GeneratePrompt />
    </div>
  );
}
