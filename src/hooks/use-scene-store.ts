import { create } from 'zustand';
import { CharGrid } from '@/lib/grid-model';
import { ToolId, MAX_UNDO, GRID_ROWS, GRID_COLS, Theme } from '@/lib/constants';
import {
  NodeId, SceneNode, SceneDocument, Bounds, ResizeCorner, SparseCell, NewNodeData,
} from '@/lib/scene/types';
import {
  createDocument, generateId, addNode, removeNodes as removeNodesDoc,
  updateNode as updateNodeDoc, moveNodes as moveNodesDoc, resizeNode as resizeNodeDoc,
  bringToFront as bringToFrontDoc, sendToBack as sendToBackDoc,
  groupNodes as groupNodesDoc, ungroupNode as ungroupNodeDoc,
  cloneDocument,
} from '@/lib/scene/document';
import { renderScene } from '@/lib/scene/renderer';
import { PreviewCell, GridPos } from '@/components/tools/types';
import {
  getNodeText, setNodeText, getTextCursorGridPos, moveTextCursor,
} from '@/lib/scene/text-editing';

export interface GenerateSelection {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export type SelectInteraction = 'idle' | 'selecting' | 'moving' | 'resizing' | 'editing';

interface SceneState {
  // Core data
  document: SceneDocument;
  renderedGrid: CharGrid;

  // Tool state
  activeTool: ToolId;
  isDrawing: boolean;
  drawStart: GridPos | null;
  preview: PreviewCell[] | null;

  // Selection
  selectedIds: NodeId[];
  selectInteraction: SelectInteraction;
  selectDragStart: GridPos | null;
  resizeCorner: ResizeCorner | null;
  drillScope: NodeId | null;
  /** Original bounds snapshot for move/resize operations */
  originalBoundsMap: Map<NodeId, Bounds> | null;

  // Text editing
  editingNodeId: NodeId | null;
  editingTextKey: string | null;
  editingCursorPos: number;
  textInputActive: boolean;
  textInputPos: GridPos | null;
  cursorRow: number;
  cursorCol: number;

  // Generate
  generateSelection: GenerateSelection | null;
  generateLoading: boolean;

  // Hover
  hoverRow: number;
  hoverCol: number;

  // Undo/redo
  undoStack: SceneDocument[];
  redoStack: SceneDocument[];

  // UI
  showGridLines: boolean;
  theme: Theme;

  // ─── Actions ───
  // Scene mutations
  addNode(partialNode: NewNodeData): NodeId;
  updateNode(id: NodeId, patch: Partial<SceneNode>): void;
  removeNodes(ids: NodeId[]): void;
  moveNodes(ids: NodeId[], dRow: number, dCol: number): void;
  resizeNode(id: NodeId, newBounds: Bounds): void;

  // Selection
  setSelection(ids: NodeId[]): void;
  clearSelection(): void;
  setDrillScope(id: NodeId | null): void;

  // Grouping
  groupSelected(): void;
  ungroupSelected(): void;

  // Z-order
  bringToFront(): void;
  sendToBack(): void;

  // Undo/redo
  pushUndo(): void;
  undo(): void;
  redo(): void;

  // Render
  rerender(): void;

  // Tool/UI state setters
  setActiveTool(tool: ToolId): void;
  setIsDrawing(drawing: boolean): void;
  setDrawStart(pos: GridPos | null): void;
  setPreview(cells: PreviewCell[] | null): void;
  setCursor(row: number, col: number): void;
  setHover(row: number, col: number): void;
  setSelectInteraction(interaction: SelectInteraction): void;
  setSelectDragStart(pos: GridPos | null): void;
  setResizeCorner(corner: ResizeCorner | null): void;
  setOriginalBoundsMap(map: Map<NodeId, Bounds> | null): void;
  setEditingNodeId(id: NodeId | null): void;
  setTextInputActive(active: boolean, pos?: GridPos | null): void;
  startEditing(nodeId: NodeId, key: string, cursorPos: number): void;
  stopEditing(): void;
  moveEditingCursor(direction: 'left' | 'right' | 'up' | 'down'): void;
  setGenerateSelection(sel: GenerateSelection | null): void;
  setGenerateLoading(loading: boolean): void;
  clearGenerate(): void;
  setShowGridLines(show: boolean): void;
  toggleTheme(): void;

  // Text editing
  typeChar(char: string): void;
  deleteChar(): void;
  moveCursor(dr: number, dc: number): void;
  newLine(): void;
  pasteText(text: string): void;

  // Grid
  resizeGrid(rows: number, cols: number): void;
  clearCanvas(): void;

  // Direct grid write for generate progressive rendering
  setCharsRaw(chars: { row: number; col: number; char: string }[]): void;
  applyChars(chars: { row: number; col: number; char: string }[]): void;
}

function makeRenderedGrid(doc: SceneDocument): CharGrid {
  return renderScene(doc);
}

export const useSceneStore = create<SceneState>((set, get) => {
  const initialDoc = createDocument(GRID_ROWS, GRID_COLS);
  return {
    document: initialDoc,
    renderedGrid: makeRenderedGrid(initialDoc),

    activeTool: 'select',
    isDrawing: false,
    drawStart: null,
    preview: null,

    selectedIds: [],
    selectInteraction: 'idle',
    selectDragStart: null,
    resizeCorner: null,
    drillScope: null,
    originalBoundsMap: null,

    editingNodeId: null,
    editingTextKey: null,
    editingCursorPos: 0,
    textInputActive: false,
    textInputPos: null,
    cursorRow: 0,
    cursorCol: 0,

    generateSelection: null,
    generateLoading: false,

    hoverRow: -1,
    hoverCol: -1,

    undoStack: [],
    redoStack: [],

    showGridLines: true,
    theme: 'light' as Theme,

    // ─── Scene mutations ──────────────────────────────────────────────

    addNode: (partialNode) => {
      const id = generateId();
      const node = {
        ...partialNode,
        id,
        visible: true,
        locked: false,
        parentId: null,
      } as SceneNode;
      const doc = addNode(get().document, node);
      const grid = makeRenderedGrid(doc);
      set({ document: doc, renderedGrid: grid });
      return id;
    },

    updateNode: (id, patch) => {
      const doc = updateNodeDoc(get().document, id, patch);
      set({ document: doc, renderedGrid: makeRenderedGrid(doc) });
    },

    removeNodes: (ids) => {
      const doc = removeNodesDoc(get().document, ids);
      set({
        document: doc,
        renderedGrid: makeRenderedGrid(doc),
        selectedIds: get().selectedIds.filter(sid => !ids.includes(sid)),
      });
    },

    moveNodes: (ids, dRow, dCol) => {
      const doc = moveNodesDoc(get().document, ids, dRow, dCol);
      set({ document: doc, renderedGrid: makeRenderedGrid(doc) });
    },

    resizeNode: (id, newBounds) => {
      const doc = resizeNodeDoc(get().document, id, newBounds);
      set({ document: doc, renderedGrid: makeRenderedGrid(doc) });
    },

    // ─── Selection ────────────────────────────────────────────────────

    setSelection: (ids) => set({ selectedIds: ids }),

    clearSelection: () => set({
      selectedIds: [],
      selectInteraction: 'idle',
      selectDragStart: null,
      resizeCorner: null,
      originalBoundsMap: null,
      preview: null,
      editingNodeId: null,
      editingTextKey: null,
      editingCursorPos: 0,
      textInputActive: false,
    }),

    setDrillScope: (id) => set({ drillScope: id, selectedIds: [] }),

    // ─── Grouping ─────────────────────────────────────────────────────

    groupSelected: () => {
      const { selectedIds, document: doc } = get();
      if (selectedIds.length < 2) return;
      get().pushUndo();
      const newDoc = groupNodesDoc(doc, selectedIds);
      // Find the new group ID (last in rootOrder that isn't in old rootOrder)
      const oldIds = new Set(doc.rootOrder);
      const groupId = newDoc.rootOrder.find(id => !oldIds.has(id));
      set({
        document: newDoc,
        renderedGrid: makeRenderedGrid(newDoc),
        selectedIds: groupId ? [groupId] : [],
      });
    },

    ungroupSelected: () => {
      const { selectedIds, document: doc } = get();
      if (selectedIds.length !== 1) return;
      const node = doc.nodes.get(selectedIds[0]);
      if (!node || node.type !== 'group') return;
      get().pushUndo();
      const newDoc = ungroupNodeDoc(doc, selectedIds[0]);
      set({
        document: newDoc,
        renderedGrid: makeRenderedGrid(newDoc),
        selectedIds: [],
      });
    },

    // ─── Z-order ──────────────────────────────────────────────────────

    bringToFront: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      get().pushUndo();
      let doc = get().document;
      for (const id of selectedIds) {
        doc = bringToFrontDoc(doc, id);
      }
      set({ document: doc, renderedGrid: makeRenderedGrid(doc) });
    },

    sendToBack: () => {
      const { selectedIds } = get();
      if (selectedIds.length === 0) return;
      get().pushUndo();
      let doc = get().document;
      for (const id of selectedIds) {
        doc = sendToBackDoc(doc, id);
      }
      set({ document: doc, renderedGrid: makeRenderedGrid(doc) });
    },

    // ─── Undo / Redo ──────────────────────────────────────────────────

    pushUndo: () => {
      const { document: doc, undoStack } = get();
      const newStack = [...undoStack, cloneDocument(doc)];
      if (newStack.length > MAX_UNDO) newStack.shift();
      set({ undoStack: newStack, redoStack: [] });
    },

    undo: () => {
      const { document: doc, undoStack, redoStack } = get();
      if (undoStack.length === 0) return;
      const newUndo = [...undoStack];
      const prev = newUndo.pop()!;
      set({
        document: prev,
        renderedGrid: makeRenderedGrid(prev),
        undoStack: newUndo,
        redoStack: [...redoStack, cloneDocument(doc)],
        selectedIds: [],
        selectInteraction: 'idle',
      });
    },

    redo: () => {
      const { document: doc, undoStack, redoStack } = get();
      if (redoStack.length === 0) return;
      const newRedo = [...redoStack];
      const next = newRedo.pop()!;
      set({
        document: next,
        renderedGrid: makeRenderedGrid(next),
        redoStack: newRedo,
        undoStack: [...undoStack, cloneDocument(doc)],
        selectedIds: [],
        selectInteraction: 'idle',
      });
    },

    // ─── Render ───────────────────────────────────────────────────────

    rerender: () => {
      set({ renderedGrid: makeRenderedGrid(get().document) });
    },

    // ─── Tool / UI state ──────────────────────────────────────────────

    setActiveTool: (tool) => {
      const g = get();
      set({
        activeTool: tool,
        preview: null,
        selectedIds: [],
        selectInteraction: 'idle',
        selectDragStart: null,
        resizeCorner: null,
        originalBoundsMap: null,
        drillScope: null,
        editingNodeId: null,
        editingTextKey: null,
        editingCursorPos: 0,
        textInputActive: false,
        generateSelection: tool === 'generate'
          ? { minRow: 0, maxRow: g.document.gridRows - 1, minCol: 0, maxCol: g.document.gridCols - 1 }
          : null,
      });
    },

    setIsDrawing: (drawing) => set({ isDrawing: drawing }),
    setDrawStart: (pos) => set({ drawStart: pos }),
    setPreview: (cells) => set({ preview: cells }),
    setCursor: (row, col) => set({ cursorRow: row, cursorCol: col }),
    setHover: (row, col) => set({ hoverRow: row, hoverCol: col }),
    setSelectInteraction: (interaction) => set({ selectInteraction: interaction }),
    setSelectDragStart: (pos) => set({ selectDragStart: pos }),
    setResizeCorner: (corner) => set({ resizeCorner: corner }),
    setOriginalBoundsMap: (map) => set({ originalBoundsMap: map }),
    setEditingNodeId: (id) => set({ editingNodeId: id }),
    setTextInputActive: (active, pos) => set({ textInputActive: active, textInputPos: pos ?? null }),

    startEditing: (nodeId, key, cursorPos) => {
      const node = get().document.nodes.get(nodeId);
      if (!node) return;
      const gridPos = getTextCursorGridPos(node, key, cursorPos);
      set({
        editingNodeId: nodeId,
        editingTextKey: key,
        editingCursorPos: cursorPos,
        textInputActive: true,
        cursorRow: gridPos?.row ?? get().cursorRow,
        cursorCol: gridPos?.col ?? get().cursorCol,
      });
    },

    stopEditing: () => {
      set({
        editingNodeId: null,
        editingTextKey: null,
        editingCursorPos: 0,
        textInputActive: false,
      });
    },

    moveEditingCursor: (direction) => {
      const { editingNodeId, editingTextKey, editingCursorPos, document: doc } = get();
      if (!editingNodeId || !editingTextKey) return;
      const node = doc.nodes.get(editingNodeId);
      if (!node) return;
      const newPos = moveTextCursor(node, editingTextKey, editingCursorPos, direction);
      const gridPos = getTextCursorGridPos(node, editingTextKey, newPos);
      set({
        editingCursorPos: newPos,
        cursorRow: gridPos?.row ?? get().cursorRow,
        cursorCol: gridPos?.col ?? get().cursorCol,
      });
    },
    setGenerateSelection: (sel) => set({ generateSelection: sel }),
    setGenerateLoading: (loading) => set({ generateLoading: loading }),
    clearGenerate: () => set({ generateSelection: null, generateLoading: false }),
    setShowGridLines: (show) => set({ showGridLines: show }),
    toggleTheme: () => {
      const next = get().theme === 'light' ? 'dark' : 'light';
      set({ theme: next as Theme });
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
        try { localStorage.setItem('ascii-editor-theme', next); } catch {}
      }
    },

    // ─── Text editing ─────────────────────────────────────────────────

    typeChar: (char) => {
      const { editingNodeId, editingTextKey, editingCursorPos, document: doc } = get();
      if (editingNodeId && editingTextKey) {
        const node = doc.nodes.get(editingNodeId);
        if (!node) return;
        const currentText = getNodeText(node, editingTextKey);
        if (currentText === null) return;

        const newText = currentText.slice(0, editingCursorPos) + char + currentText.slice(editingCursorPos);
        const result = setNodeText(node, editingTextKey, newText);
        if (!result) return;

        const newDoc = updateNodeDoc(doc, editingNodeId, { ...result.patch, bounds: result.bounds } as any);
        const grid = makeRenderedGrid(newDoc);
        const newPos = editingCursorPos + char.length;
        const updatedNode = newDoc.nodes.get(editingNodeId);
        const gridPos = updatedNode ? getTextCursorGridPos(updatedNode, editingTextKey, newPos) : null;

        set({
          document: newDoc,
          renderedGrid: grid,
          editingCursorPos: newPos,
          cursorRow: gridPos?.row ?? get().cursorRow,
          cursorCol: gridPos?.col ?? get().cursorCol,
        });
        return;
      }
      // Fallback: direct text at cursor (creates a StrokeNode)
      const { cursorCol: cc, cursorRow: cr } = get();
      if (cc >= doc.gridCols) return;
      get().pushUndo();
      get().addNode({
        type: 'stroke',
        name: 'Text',
        bounds: { x: cc, y: cr, width: 1, height: 1 },
        cells: [{ row: 0, col: 0, char }],
      });
      set({ cursorCol: Math.min(cc + 1, doc.gridCols - 1) });
    },

    deleteChar: () => {
      const { editingNodeId, editingTextKey, editingCursorPos, document: doc } = get();
      if (editingNodeId && editingTextKey) {
        const node = doc.nodes.get(editingNodeId);
        if (!node) return;
        const currentText = getNodeText(node, editingTextKey);
        if (currentText === null || editingCursorPos <= 0) return;

        const newText = currentText.slice(0, editingCursorPos - 1) + currentText.slice(editingCursorPos);
        const result = setNodeText(node, editingTextKey, newText);
        if (!result) return;

        const newDoc = updateNodeDoc(doc, editingNodeId, { ...result.patch, bounds: result.bounds } as any);
        const grid = makeRenderedGrid(newDoc);
        const newPos = editingCursorPos - 1;
        const updatedNode = newDoc.nodes.get(editingNodeId);
        const gridPos = updatedNode ? getTextCursorGridPos(updatedNode, editingTextKey, newPos) : null;

        set({
          document: newDoc,
          renderedGrid: grid,
          editingCursorPos: newPos,
          cursorRow: gridPos?.row ?? get().cursorRow,
          cursorCol: gridPos?.col ?? get().cursorCol,
        });
        return;
      }
      // Fallback cursor backspace
      const { cursorCol: cc, cursorRow: cr } = get();
      if (cc > 0) set({ cursorCol: cc - 1 });
      else if (cr > 0) set({ cursorRow: cr - 1, cursorCol: doc.gridCols - 1 });
    },

    moveCursor: (dr, dc) => {
      const { cursorRow, cursorCol, document: doc } = get();
      set({
        cursorRow: Math.max(0, Math.min(cursorRow + dr, doc.gridRows - 1)),
        cursorCol: Math.max(0, Math.min(cursorCol + dc, doc.gridCols - 1)),
      });
    },

    newLine: () => {
      const { cursorRow, document: doc } = get();
      set({ cursorRow: Math.min(cursorRow + 1, doc.gridRows - 1), cursorCol: 0 });
    },

    pasteText: (text) => {
      const { cursorRow, cursorCol, document: doc } = get();
      get().pushUndo();

      let cleaned = text;
      const trimmed = cleaned.trim();
      if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
        const inner = trimmed.slice(trimmed.indexOf('\n') + 1);
        cleaned = inner.endsWith('```') ? inner.slice(0, inner.lastIndexOf('```')) : inner;
      }
      cleaned = cleaned.replace(/\t/g, '    ');
      const lines = cleaned.split('\n').map(l => l.replace(/\r$/, ''));

      // Create a StrokeNode from pasted text
      const cells: SparseCell[] = [];
      let maxCol = 0;
      for (let i = 0; i < lines.length; i++) {
        if (cursorRow + i >= doc.gridRows) break;
        for (let j = 0; j < lines[i].length; j++) {
          if (cursorCol + j >= doc.gridCols) break;
          if (lines[i][j] !== ' ') {
            cells.push({ row: i, col: j, char: lines[i][j] });
            maxCol = Math.max(maxCol, j);
          }
        }
      }

      if (cells.length > 0) {
        const height = Math.min(lines.length, doc.gridRows - cursorRow);
        const width = Math.min(maxCol + 1, doc.gridCols - cursorCol);
        get().addNode({
          type: 'stroke',
          name: 'Pasted Text',
          bounds: { x: cursorCol, y: cursorRow, width, height },
          cells,
        });
      }

      const lastRow = Math.min(cursorRow + lines.length - 1, doc.gridRows - 1);
      const lastLine = lines[lines.length - 1] || '';
      set({
        cursorRow: lastRow,
        cursorCol: Math.min(cursorCol + lastLine.length, doc.gridCols - 1),
      });
    },

    // ─── Grid ─────────────────────────────────────────────────────────

    resizeGrid: (rows, cols) => {
      get().pushUndo();
      const doc = get().document;
      const newDoc = { ...doc, gridRows: rows, gridCols: cols, nodes: new Map(doc.nodes), rootOrder: [...doc.rootOrder] };
      set({
        document: newDoc,
        renderedGrid: makeRenderedGrid(newDoc),
        cursorRow: Math.min(get().cursorRow, rows - 1),
        cursorCol: Math.min(get().cursorCol, cols - 1),
      });
    },

    clearCanvas: () => {
      get().pushUndo();
      const { document: doc } = get();
      const newDoc = createDocument(doc.gridRows, doc.gridCols);
      set({
        document: newDoc,
        renderedGrid: makeRenderedGrid(newDoc),
        selectedIds: [],
        selectInteraction: 'idle',
      });
    },

    // ─── Direct grid manipulation (for generate tool progressive rendering) ─

    setCharsRaw: (chars) => {
      // Write directly to renderedGrid for progressive display (generate tool)
      const grid = get().renderedGrid;
      for (const c of chars) {
        grid.setChar(c.row, c.col, c.char);
      }
      // Force re-render by creating new reference
      set({ renderedGrid: Object.assign(Object.create(Object.getPrototypeOf(grid)), grid) });
    },

    applyChars: (chars) => {
      // Create a StrokeNode from the provided chars (used by generate tool final pass)
      if (chars.length === 0) return;
      const doc = get().document;

      // Compute bounding box
      let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
      for (const c of chars) {
        if (c.row < minR) minR = c.row;
        if (c.row > maxR) maxR = c.row;
        if (c.col < minC) minC = c.col;
        if (c.col > maxC) maxC = c.col;
      }

      // Convert to relative SparseCell coords, skip spaces
      const cells: SparseCell[] = [];
      for (const c of chars) {
        if (c.char !== ' ') {
          cells.push({ row: c.row - minR, col: c.col - minC, char: c.char });
        }
      }

      if (cells.length > 0) {
        get().addNode({
          type: 'stroke',
          name: 'Generated Content',
          bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
          cells,
        });
      }
    },
  };
});

// Re-export for backward compatibility
export const useEditorStore = useSceneStore;
