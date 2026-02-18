import { useEffect } from 'react';
import { useEditorStore } from './use-editor-store';
import { getNodeText, getPrimaryTextKey } from '@/lib/scene/text-editing';

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = useEditorStore.getState();
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isBridgeInput = target?.dataset?.editorInputBridge === 'true';

      // Escape always returns to Select tool (Figma-style), regardless of focused element.
      if (e.key === 'Escape') {
        e.preventDefault();
        if (s.textInputActive) {
          s.stopEditing();
          return;
        }
        if (s.generateSelection) s.clearGenerate();
        if (s.isDrawing) {
          s.setIsDrawing(false);
          s.setDrawStart(null);
          s.setPreview(null);
        }
        if (s.selectedIds.length > 0) s.clearSelection();
        if (s.drillScope) s.setDrillScope(null);
        if (s.activeTool !== 'select') s.setActiveTool('select');
        return;
      }

      // Don't intercept when user is typing in an input/textarea (e.g. PropertiesPanel)
      if ((tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) && !isBridgeInput) {
        return;
      }

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

      // Enter: edit selected object's primary text field (Figma-style)
      if (s.activeTool === 'select' && s.selectedIds.length === 1 && e.key === 'Enter') {
        const node = s.document.nodes.get(s.selectedIds[0]);
        if (node) {
          const key = getPrimaryTextKey(node.type);
          if (key) {
            const text = getNodeText(node, key);
            if (text !== null) {
              e.preventDefault();
              s.pushUndo();
              s.startEditing(node.id, key, text.length);
              return;
            }
          }
        }
      }

      // Delete/Backspace: remove selected objects (any tool, like Figma)
      if (s.selectedIds.length > 0 && (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace')) {
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

    };

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isBridgeInput = target?.dataset?.editorInputBridge === 'true';
      // Don't intercept paste in inputs/textareas (e.g. PropertiesPanel)
      if ((tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) && !isBridgeInput) {
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
