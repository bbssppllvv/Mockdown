// Scene graph node types — the core data model for the editor.
// Every tool creates exactly one SceneNode. The CharGrid is computed from these.

export type NodeId = string; // nanoid

export interface Bounds {
  x: number;      // col (left)
  y: number;      // row (top)
  width: number;  // cols
  height: number; // rows
}

export interface SparseCell {
  row: number; // relative to bounds origin
  col: number;
  char: string;
}

// Base fields shared by every node
interface BaseNode {
  id: NodeId;
  type: string;
  name: string;
  bounds: Bounds;
  visible: boolean;
  locked: boolean;
  parentId: NodeId | null;
}

// ── Box ──────────────────────────────────────────────────────────────────────
export interface BoxNode extends BaseNode {
  type: 'box';
}

// ── Card (box + title + divider) ─────────────────────────────────────────────
export interface CardNode extends BaseNode {
  type: 'card';
  title: string;
}

// ── Table ────────────────────────────────────────────────────────────────────
export interface TableNode extends BaseNode {
  type: 'table';
  columns: string[];
  columnWidths: number[];
  rowCount: number;
}

// ── HSplit ────────────────────────────────────────────────────────────────────
export interface HSplitNode extends BaseNode {
  type: 'hsplit';
  ratio: number; // 0..1 position of the vertical divider
}

// ── Placeholder ──────────────────────────────────────────────────────────────
export interface PlaceholderNode extends BaseNode {
  type: 'placeholder';
  label: string;
}

// ── Button ───────────────────────────────────────────────────────────────────
export interface ButtonNode extends BaseNode {
  type: 'button';
  label: string;
}

// ── Checkbox ─────────────────────────────────────────────────────────────────
export interface CheckboxNode extends BaseNode {
  type: 'checkbox';
  label: string;
  checked: boolean;
}

// ── Radio ────────────────────────────────────────────────────────────────────
export interface RadioNode extends BaseNode {
  type: 'radio';
  label: string;
  selected: boolean;
}

// ── Input ────────────────────────────────────────────────────────────────────
export interface InputNode extends BaseNode {
  type: 'input';
  placeholder: string;
}

// ── Dropdown ─────────────────────────────────────────────────────────────────
export interface DropdownNode extends BaseNode {
  type: 'dropdown';
  label: string;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
export interface TabsNode extends BaseNode {
  type: 'tabs';
  tabs: string[];
  activeIndex: number;
}

// ── Nav ──────────────────────────────────────────────────────────────────────
export interface NavNode extends BaseNode {
  type: 'nav';
  logo: string;
  links: string[];
  action: string;
}

// ── List ─────────────────────────────────────────────────────────────────────
export interface ListNode extends BaseNode {
  type: 'list';
  items: string[];
}

// ── Modal ────────────────────────────────────────────────────────────────────
export interface ModalNode extends BaseNode {
  type: 'modal';
  title: string;
}

// ── Search ───────────────────────────────────────────────────────────────────
export interface SearchNode extends BaseNode {
  type: 'search';
  placeholder: string;
}

// ── Toggle ───────────────────────────────────────────────────────────────────
export interface ToggleNode extends BaseNode {
  type: 'toggle';
  label: string;
  on: boolean;
}

// ── Progress ─────────────────────────────────────────────────────────────────
export interface ProgressNode extends BaseNode {
  type: 'progress';
  value: number; // 0-100
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────
export interface BreadcrumbNode extends BaseNode {
  type: 'breadcrumb';
  items: string[];
}

// ── Pagination ───────────────────────────────────────────────────────────────
export interface PaginationNode extends BaseNode {
  type: 'pagination';
  currentPage: number;
  totalPages: number;
}

// ── Line ─────────────────────────────────────────────────────────────────────
export interface LineNode extends BaseNode {
  type: 'line';
  points: { row: number; col: number }[];
}

// ── Arrow ────────────────────────────────────────────────────────────────────
export interface ArrowNode extends BaseNode {
  type: 'arrow';
  points: { row: number; col: number }[];
}

// ── Text ─────────────────────────────────────────────────────────────────────
export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
}

// ── Stroke (freeform pencil/brush/spray/shade/fill/magic output) ─────────────
export interface StrokeNode extends BaseNode {
  type: 'stroke';
  cells: SparseCell[];
}

// ── Group (user grouping via Cmd+G) ──────────────────────────────────────────
export interface GroupNode extends BaseNode {
  type: 'group';
  childIds: NodeId[];
}

// ── Discriminated union ──────────────────────────────────────────────────────
export type SceneNode =
  | BoxNode
  | CardNode
  | TableNode
  | HSplitNode
  | PlaceholderNode
  | ButtonNode
  | CheckboxNode
  | RadioNode
  | InputNode
  | DropdownNode
  | TabsNode
  | NavNode
  | ListNode
  | ModalNode
  | SearchNode
  | ToggleNode
  | ProgressNode
  | BreadcrumbNode
  | PaginationNode
  | LineNode
  | ArrowNode
  | TextNode
  | StrokeNode
  | GroupNode;

export type SceneNodeType = SceneNode['type'];

// Distributive Omit that preserves union members
export type NewNodeData = SceneNode extends infer T
  ? T extends unknown
    ? Omit<T, 'id' | 'visible' | 'locked' | 'parentId'>
    : never
  : never;

// ── Resize corner identifiers ────────────────────────────────────────────────
export type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// ── Scene Document ───────────────────────────────────────────────────────────
export interface SceneDocument {
  nodes: Map<NodeId, SceneNode>;
  rootOrder: NodeId[];        // z-order: first = bottom, last = top
  gridRows: number;
  gridCols: number;
}
