import { CharGrid } from '@/lib/grid-model';
import { NodeId, SparseCell, NewNodeData } from '@/lib/scene/types';

export interface GridPos {
  row: number;
  col: number;
}

export interface PreviewCell {
  row: number;
  col: number;
  char: string;
}

// Legacy: kept for backward-compat during migration
export interface DrawResult {
  chars: { row: number; col: number; char: string }[];
}

// New: what tools return in the scene-graph world
export type ToolResult =
  | { kind: 'create'; node: NewNodeData }
  | { kind: 'delete'; nodeIds: NodeId[] }
  | null;

export interface DrawingTool {
  id: string;
  label: string;
  icon: string;
  /** If true, onDrag commits cells incrementally during drag (pencil, brush, spray) */
  continuous?: boolean;
  /** For tools that need text input after click (returns label text prompt) */
  needsTextInput?: boolean;

  onClick?(pos: GridPos, grid: CharGrid): ToolResult;
  onDragStart?(pos: GridPos, grid: CharGrid): PreviewCell[] | null;
  onDrag?(start: GridPos, current: GridPos, grid: CharGrid): PreviewCell[] | null;
  onDragEnd?(start: GridPos, end: GridPos, grid: CharGrid): ToolResult;
  onTextInput?(pos: GridPos, text: string, grid: CharGrid): ToolResult;

  /** For continuous tools: accumulate cells during drag */
  onContinuousDrag?(
    prev: GridPos, current: GridPos, grid: CharGrid,
    accumulator: SparseCell[]
  ): PreviewCell[] | null;
}
