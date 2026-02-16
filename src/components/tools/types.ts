import { CharGrid } from '@/lib/grid-model';

export interface GridPos {
  row: number;
  col: number;
}

export interface PreviewCell {
  row: number;
  col: number;
  char: string;
}

export interface DrawResult {
  chars: { row: number; col: number; char: string }[];
}

export interface DrawingTool {
  id: string;
  label: string;
  icon: string;
  onDragStart?(pos: GridPos, grid: CharGrid): PreviewCell[] | null;
  onDrag?(start: GridPos, current: GridPos, grid: CharGrid): PreviewCell[] | null;
  onDragEnd?(start: GridPos, end: GridPos, grid: CharGrid): DrawResult | null;
  onClick?(pos: GridPos, grid: CharGrid): DrawResult | null;
  /** For tools that need text input after click (returns label text prompt) */
  needsTextInput?: boolean;
  onTextInput?(pos: GridPos, text: string, grid: CharGrid): DrawResult | null;
}
