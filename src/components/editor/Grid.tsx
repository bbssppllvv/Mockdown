'use client';

import { useRef, useCallback } from 'react';
import { useCanvasRenderer } from '@/hooks/use-canvas-renderer';
import { useGridMouse } from '@/hooks/use-grid-mouse';
import { useEditorStore } from '@/hooks/use-editor-store';
import { GeneratePrompt } from './GeneratePrompt';
import { hitTestCornerHandle, isInsideNodeBounds } from '@/lib/scene/hit-test';

export function Grid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasRef, cellSize, scale } = useCanvasRenderer(containerRef);
  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handleDoubleClick } = useGridMouse(
    cellSize.width,
    cellSize.height,
    scale
  );
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectInteraction = useEditorStore((s) => s.selectInteraction);
  const hoverRow = useEditorStore((s) => s.hoverRow);
  const hoverCol = useEditorStore((s) => s.hoverCol);
  const doc = useEditorStore((s) => s.document);

  // Hidden textarea for mobile keyboard input
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const focusMobileInput = useCallback(() => {
    // Small delay so the pointerdown/touch event settles first
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleMobileInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    if (!value) return;
    const s = useEditorStore.getState();
    if (s.textInputActive && s.editingNodeId) {
      for (const ch of value) {
        s.typeChar(ch);
      }
    }
    textarea.value = '';
  }, []);

  const handleMobileKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const s = useEditorStore.getState();
    if (!s.textInputActive || !s.editingNodeId) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      s.deleteChar();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const node = s.document.nodes.get(s.editingNodeId);
      if (node && node.type === 'text') {
        s.typeChar('\n');
      } else {
        s.stopEditing();
      }
    }
  }, []);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerDown(e);
    focusMobileInput();
  }, [handlePointerDown, focusMobileInput]);

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
    <div ref={containerRef} className="relative overflow-auto flex-1 bg-white dark:bg-[#1a1a1a]">
      {/* 3.3: Scaled wrapper for responsive grid fitting */}
      <div style={{
        transform: scale < 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}>
        <canvas ref={canvasRef} className="block" />
        {/* Hidden textarea to trigger mobile virtual keyboard */}
        <textarea
          ref={inputRef}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          style={{ top: 0, left: 0, fontSize: 16 }}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onInput={handleMobileInput}
          onKeyDown={handleMobileKeyDown}
          aria-hidden="true"
          tabIndex={-1}
        />
        {/* 3.1: Pointer events (touch + mouse + pen) instead of mouse-only */}
        <div
          className="absolute inset-0"
          style={{
            cursor: getCursorStyle(),
            touchAction: 'none', // 3.1: prevent browser gesture hijacking
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      <GeneratePrompt />
    </div>
  );
}
