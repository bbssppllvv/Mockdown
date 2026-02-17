import { useEffect } from 'react';
import { useEditorStore } from './use-editor-store';

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = useEditorStore.getState();

      // When generate prompt is open, don't intercept anything
      if (s.generateSelection) return;

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

      // Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (text) {
            useEditorStore.getState().pasteText(text);
          }
        }).catch((err) => {
          console.warn('[paste] clipboard read failed:', err);
        });
        return;
      }

      // Group / Ungroup
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          s.ungroupSelected();
        } else {
          s.groupSelected();
        }
        return;
      }

      // Z-order: Cmd+] / Cmd+[
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        s.bringToFront();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        s.sendToBack();
        return;
      }

      // Handle text input when editing a node
      if (s.textInputActive && s.editingNodeId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          s.stopEditing();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          // For multiline text nodes, insert newline; for others, stop editing
          const node = s.document.nodes.get(s.editingNodeId);
          if (node && node.type === 'text' && s.editingTextKey === 'content') {
            s.typeChar('\n');
          } else {
            s.stopEditing();
          }
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          s.deleteChar();
          return;
        }
        // Arrow keys move cursor within text
        if (e.key === 'ArrowLeft') { e.preventDefault(); s.moveEditingCursor('left'); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); s.moveEditingCursor('right'); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); s.moveEditingCursor('up'); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); s.moveEditingCursor('down'); return; }
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          s.typeChar(e.key);
          return;
        }
        return;
      }

      // Select tool: selection-based operations
      if (s.activeTool === 'select' && s.selectedIds.length > 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (s.drillScope) {
            // Exit drill scope and clear selection (children aren't selectable outside scope)
            s.clearSelection();
            s.setDrillScope(null);
          } else {
            s.clearSelection();
          }
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          s.pushUndo();
          s.removeNodes([...s.selectedIds]);
          return;
        }
        // Arrow keys move selected nodes
        if (e.key === 'ArrowUp') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], -1, 0); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], 1, 0); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], 0, -1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], 0, 1); return; }
      }

      // Escape: cancel drawing or drill-out or reset to select tool
      if (e.key === 'Escape') {
        if (s.drillScope) {
          s.setDrillScope(null);
          return;
        }
        if (s.isDrawing) {
          s.setIsDrawing(false);
          s.setDrawStart(null);
          s.setPreview(null);
        } else {
          s.setActiveTool('select');
        }
        return;
      }

      // Arrow keys (cursor movement when no selection)
      if (e.key === 'ArrowUp') { e.preventDefault(); s.moveCursor(-1, 0); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); s.moveCursor(1, 0); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); s.moveCursor(0, -1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); s.moveCursor(0, 1); return; }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (useEditorStore.getState().generateSelection) return;
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
