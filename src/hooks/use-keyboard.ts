import { useEffect } from 'react';
import { useEditorStore } from './use-editor-store';

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea (e.g. PropertiesPanel)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

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

      // Paste: handled exclusively by the 'paste' event listener below.
      // Do NOT handle Cmd/Ctrl+V here to avoid double-paste.
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
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
        if (e.key === 'Delete') {
          e.preventDefault();
          s.deleteCharForward();
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

      // Delete/Backspace: remove selected objects (any tool, like Figma)
      if (s.selectedIds.length > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        s.pushUndo();
        s.removeNodes([...s.selectedIds]);
        return;
      }

      // Arrow keys: move selected objects (select tool only)
      if (s.activeTool === 'select' && s.selectedIds.length > 0) {
        if (e.key === 'ArrowUp') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], -1, 0); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], 1, 0); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], 0, -1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); s.pushUndo(); s.moveNodes([...s.selectedIds], 0, 1); return; }
      }

      // ── Consolidated Escape: single priority chain ──────────────────
      if (e.key === 'Escape') {
        e.preventDefault();
        // 1. Stop text editing (if still active without the earlier block catching it)
        if (s.textInputActive) {
          s.stopEditing();
          return;
        }
        // 2. Cancel active drawing
        if (s.isDrawing) {
          s.setIsDrawing(false);
          s.setDrawStart(null);
          s.setPreview(null);
          return;
        }
        // 3. Clear selection (and exit drill scope if inside one)
        if (s.selectedIds.length > 0) {
          s.clearSelection();
          if (s.drillScope) s.setDrillScope(null);
          return;
        }
        // 4. Exit drill scope
        if (s.drillScope) {
          s.setDrillScope(null);
          return;
        }
        // 5. Reset tool to select
        if (s.activeTool !== 'select') {
          s.setActiveTool('select');
          return;
        }
        return;
      }

    };

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste in inputs/textareas (e.g. PropertiesPanel)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
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
