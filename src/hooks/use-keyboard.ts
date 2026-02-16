import { useEffect } from 'react';
import { useEditorStore } from './use-editor-store';
import { clearBounds } from '@/lib/select-operations';

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = useEditorStore.getState();

      // When magic prompt is open, don't intercept anything
      if (s.magicSelection) return;

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          s.redo();
        } else {
          s.undo();
        }
        return;
      }

      // Let default copy/select-all work
      if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'a')) {
        return;
      }

      // Paste is handled via paste event listener
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        return;
      }

      // Handle text input for click-to-type tools (button, checkbox, etc)
      if (s.textInputActive) {
        if (e.key === 'Escape') {
          s.finalizeLabelEdit();
          s.setTextInputActive(false);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          s.finalizeLabelEdit();
          s.setTextInputActive(false);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          s.deleteChar();
          return;
        }
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          s.typeChar(e.key);
          return;
        }
        return;
      }

      // Select tool: Escape clears selection, Delete/Backspace erases selected object
      if (s.activeTool === 'select' && s.selection) {
        if (e.key === 'Escape') {
          e.preventDefault();
          s.clearSelection();
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          s.pushUndo();
          clearBounds(s.grid, s.selection.bounds);
          s.applyChars([]);
          s.clearSelection();
          return;
        }
      }

      // Escape: cancel drawing or reset to cursor tool
      if (e.key === 'Escape') {
        if (s.isDrawing) {
          s.setIsDrawing(false);
          s.setDrawStart(null);
          s.setPreview(null);
        } else {
          s.setActiveTool('cursor');
        }
        return;
      }

      // Arrow keys always work
      if (e.key === 'ArrowUp') { e.preventDefault(); s.moveCursor(-1, 0); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); s.moveCursor(1, 0); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); s.moveCursor(0, -1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); s.moveCursor(0, 1); return; }

      // Typing works only in cursor mode
      if (s.activeTool === 'cursor') {
        if (e.key === 'Enter') { e.preventDefault(); s.newLine(); return; }
        if (e.key === 'Backspace') { e.preventDefault(); s.deleteChar(); return; }
        if (e.key === 'Tab') { e.preventDefault(); s.moveCursor(0, 4); return; }
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          s.typeChar(e.key);
          return;
        }
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste when magic prompt is open
      if (useEditorStore.getState().magicSelection) return;

      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain');
      if (text) {
        useEditorStore.getState().pasteText(text);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, []);
}
