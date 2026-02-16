import { create } from 'zustand';
import { CharGrid } from '@/lib/grid-model';
import { ToolId } from '@/lib/constants';
import { MAX_UNDO } from '@/lib/constants';
import { PreviewCell, GridPos } from '@/components/tools/types';
import { ObjectBounds, ObjectType } from '@/lib/object-detection';
import { ResizeCorner } from '@/lib/select-operations';

interface LabelEdit {
  row: number;
  contentStart: number;
  oldEnd: number;
  suffix: string; // " ]" for button/dropdown, "" for checkbox/radio
}

export interface MagicSelection {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface Selection {
  bounds: ObjectBounds;
  type: ObjectType;
}

export type SelectInteraction = 'idle' | 'moving' | 'resizing';

interface EditorState {
  grid: CharGrid;
  activeTool: ToolId;
  cursorRow: number;
  cursorCol: number;
  isDrawing: boolean;
  drawStart: GridPos | null;
  preview: PreviewCell[] | null;
  undoStack: CharGrid[];
  redoStack: CharGrid[];
  showGridLines: boolean;
  textInputActive: boolean;
  textInputPos: GridPos | null;
  labelEdit: LabelEdit | null;
  hoverRow: number;
  hoverCol: number;
  magicSelection: MagicSelection | null;
  magicLoading: boolean;

  // Select tool state
  selection: Selection | null;
  selectInteraction: SelectInteraction;
  selectDragStart: GridPos | null;
  selectOriginalBounds: ObjectBounds | null;
  resizeCorner: ResizeCorner | null;

  setGrid: (grid: CharGrid) => void;
  setActiveTool: (tool: ToolId) => void;
  setCursor: (row: number, col: number) => void;
  setIsDrawing: (drawing: boolean) => void;
  setDrawStart: (pos: GridPos | null) => void;
  setPreview: (preview: PreviewCell[] | null) => void;
  setShowGridLines: (show: boolean) => void;
  setTextInputActive: (active: boolean, pos?: GridPos | null) => void;
  setLabelEdit: (info: LabelEdit | null) => void;
  setHover: (row: number, col: number) => void;
  setMagicSelection: (sel: MagicSelection | null) => void;
  setMagicLoading: (loading: boolean) => void;
  clearMagic: () => void;

  // Select tool actions
  setSelection: (sel: Selection | null) => void;
  clearSelection: () => void;
  setSelectInteraction: (interaction: SelectInteraction) => void;
  setSelectDragStart: (pos: GridPos | null) => void;
  setSelectOriginalBounds: (bounds: ObjectBounds | null) => void;
  setResizeCorner: (corner: ResizeCorner | null) => void;

  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  applyChars: (chars: { row: number; col: number; char: string }[]) => void;
  pasteText: (text: string) => void;
  typeChar: (char: string) => void;
  deleteChar: () => void;
  finalizeLabelEdit: () => void;
  moveCursor: (dr: number, dc: number) => void;
  newLine: () => void;
  resizeGrid: (rows: number, cols: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  grid: new CharGrid(),
  activeTool: 'cursor',
  cursorRow: 0,
  cursorCol: 0,
  isDrawing: false,
  drawStart: null,
  preview: null,
  undoStack: [],
  redoStack: [],
  showGridLines: true,
  textInputActive: false,
  textInputPos: null,
  labelEdit: null,
  hoverRow: -1,
  hoverCol: -1,
  magicSelection: null,
  magicLoading: false,

  // Select tool state
  selection: null,
  selectInteraction: 'idle',
  selectDragStart: null,
  selectOriginalBounds: null,
  resizeCorner: null,

  setGrid: (grid) => set({ grid }),
  setActiveTool: (tool) => set({
    activeTool: tool,
    preview: null,
    magicSelection: null,
    selection: null,
    selectInteraction: 'idle',
    selectDragStart: null,
    selectOriginalBounds: null,
    resizeCorner: null,
  }),
  setCursor: (row, col) => set({ cursorRow: row, cursorCol: col }),
  setIsDrawing: (drawing) => set({ isDrawing: drawing }),
  setDrawStart: (pos) => set({ drawStart: pos }),
  setPreview: (preview) => set({ preview }),
  setShowGridLines: (show) => set({ showGridLines: show }),
  setTextInputActive: (active, pos) =>
    set({ textInputActive: active, textInputPos: pos ?? null }),
  setLabelEdit: (info) => set({ labelEdit: info }),
  setHover: (row, col) => set({ hoverRow: row, hoverCol: col }),
  setMagicSelection: (sel) => set({ magicSelection: sel }),
  setMagicLoading: (loading) => set({ magicLoading: loading }),
  clearMagic: () => set({ magicSelection: null, magicLoading: false }),

  // Select tool actions
  setSelection: (sel) => set({ selection: sel }),
  clearSelection: () => set({
    selection: null,
    selectInteraction: 'idle',
    selectDragStart: null,
    selectOriginalBounds: null,
    resizeCorner: null,
    preview: null,
  }),
  setSelectInteraction: (interaction) => set({ selectInteraction: interaction }),
  setSelectDragStart: (pos) => set({ selectDragStart: pos }),
  setSelectOriginalBounds: (bounds) => set({ selectOriginalBounds: bounds }),
  setResizeCorner: (corner) => set({ resizeCorner: corner }),

  pushUndo: () => {
    const { grid, undoStack } = get();
    const newStack = [...undoStack, grid.clone()];
    if (newStack.length > MAX_UNDO) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { grid, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const newUndo = [...undoStack];
    const prev = newUndo.pop()!;
    set({
      grid: prev,
      undoStack: newUndo,
      redoStack: [...redoStack, grid.clone()],
    });
  },

  redo: () => {
    const { grid, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const next = newRedo.pop()!;
    set({
      grid: next,
      redoStack: newRedo,
      undoStack: [...undoStack, grid.clone()],
    });
  },

  applyChars: (chars) => {
    const { grid } = get();
    for (const c of chars) {
      grid.setChar(c.row, c.col, c.char);
    }
    set({ grid: Object.assign(Object.create(Object.getPrototypeOf(grid)), grid) });
  },

  pasteText: (text) => {
    const { grid, cursorRow, cursorCol, pushUndo } = get();
    pushUndo();

    // Strip outer code fence if pasting our own export back
    let cleaned = text;
    const trimmed = cleaned.trim();
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      const inner = trimmed.slice(trimmed.indexOf('\n') + 1);
      cleaned = inner.endsWith('```')
        ? inner.slice(0, inner.lastIndexOf('```'))
        : inner;
    }

    // Convert tabs to spaces
    cleaned = cleaned.replace(/\t/g, '    ');

    // Remove trailing \r for Windows line endings
    const lines = cleaned.split('\n').map((l) => l.replace(/\r$/, ''));

    let lastRow = cursorRow;
    let lastCol = cursorCol;
    for (let i = 0; i < lines.length; i++) {
      const row = cursorRow + i;
      if (row >= grid.rows) break;
      for (let j = 0; j < lines[i].length; j++) {
        const col = cursorCol + j;
        if (col >= grid.cols) break;
        grid.setChar(row, col, lines[i][j]);
        lastRow = row;
        lastCol = col + 1;
      }
    }
    set({
      grid: Object.assign(Object.create(Object.getPrototypeOf(grid)), grid),
      cursorRow: lastRow,
      cursorCol: Math.min(lastCol, grid.cols - 1),
    });
  },

  typeChar: (char) => {
    const { grid, cursorRow, cursorCol, pushUndo } = get();
    if (cursorCol >= grid.cols) return;
    pushUndo();
    grid.setChar(cursorRow, cursorCol, char);
    set({
      grid: Object.assign(Object.create(Object.getPrototypeOf(grid)), grid),
      cursorCol: Math.min(cursorCol + 1, grid.cols - 1),
    });
  },

  deleteChar: () => {
    const { grid, cursorRow, cursorCol, pushUndo } = get();
    if (cursorCol <= 0 && cursorRow <= 0) return;
    pushUndo();
    let newRow = cursorRow;
    let newCol = cursorCol;
    if (cursorCol > 0) {
      newCol = cursorCol - 1;
    } else if (cursorRow > 0) {
      newRow = cursorRow - 1;
      newCol = grid.cols - 1;
    }
    grid.setChar(newRow, newCol, ' ');
    set({
      grid: Object.assign(Object.create(Object.getPrototypeOf(grid)), grid),
      cursorRow: newRow,
      cursorCol: newCol,
    });
  },

  finalizeLabelEdit: () => {
    const { grid, labelEdit, cursorCol } = get();
    if (!labelEdit) return;
    const { row, oldEnd, suffix } = labelEdit;

    // Clear leftover chars from cursor to old widget end
    for (let c = cursorCol; c <= oldEnd; c++) {
      if (c < grid.cols) grid.setChar(row, c, ' ');
    }

    // Write closing suffix (e.g. " ]") at cursor position
    for (let i = 0; i < suffix.length; i++) {
      const c = cursorCol + i;
      if (c < grid.cols) grid.setChar(row, c, suffix[i]);
    }

    set({
      grid: Object.assign(Object.create(Object.getPrototypeOf(grid)), grid),
      labelEdit: null,
    });
  },

  moveCursor: (dr, dc) => {
    const { cursorRow, cursorCol, grid } = get();
    const newRow = Math.max(0, Math.min(cursorRow + dr, grid.rows - 1));
    const newCol = Math.max(0, Math.min(cursorCol + dc, grid.cols - 1));
    set({ cursorRow: newRow, cursorCol: newCol });
  },

  newLine: () => {
    const { cursorRow, grid } = get();
    const newRow = Math.min(cursorRow + 1, grid.rows - 1);
    set({ cursorRow: newRow, cursorCol: 0 });
  },

  resizeGrid: (rows, cols) => {
    const { grid, pushUndo } = get();
    pushUndo();
    const newGrid = new CharGrid(rows, cols);
    const copyRows = Math.min(grid.rows, rows);
    const copyCols = Math.min(grid.cols, cols);
    for (let r = 0; r < copyRows; r++) {
      for (let c = 0; c < copyCols; c++) {
        newGrid.cells[r][c] = grid.cells[r][c];
      }
    }
    set({
      grid: newGrid,
      cursorRow: Math.min(get().cursorRow, rows - 1),
      cursorCol: Math.min(get().cursorCol, cols - 1),
    });
  },
}));
