import { CharGrid } from '../grid-model';
import {
  SceneDocument, SceneNode, Bounds,
  BoxNode, CardNode, TableNode, HSplitNode, PlaceholderNode,
  ButtonNode, CheckboxNode, RadioNode, InputNode, DropdownNode,
  TabsNode, NavNode, ListNode, ModalNode, SearchNode, ToggleNode,
  ProgressNode, BreadcrumbNode, PaginationNode,
  LineNode, ArrowNode, TextNode,
  StrokeNode, GroupNode,
} from './types';
import { getZOrderedNodes } from './document';
import { BOX, isAnyBoxChar, getBoxDirs, dirsToBoxChar } from '../box-chars';
import { buildPolylineCells } from '../polyline';

// ── Main render pipeline ─────────────────────────────────────────────────────

export function renderScene(doc: SceneDocument): CharGrid {
  const grid = new CharGrid(doc.gridRows, doc.gridCols);
  const nodes = getZOrderedNodes(doc);

  // Track positions where box-drawing characters are placed
  const boxCharPositions: { row: number; col: number }[] = [];

  // Phase 1: Stamp each visible node onto the grid (bottom → top z-order)
  for (const node of nodes) {
    if (!node.visible) continue;
    if (node.type === 'group') continue; // groups don't render directly
    renderNode(grid, node, boxCharPositions);
  }

  // Phase 2: Junction resolution - only for tracked box-char positions
  resolveJunctions(grid, boxCharPositions);

  return grid;
}

// ── Type dispatcher ──────────────────────────────────────────────────────────

function renderNode(grid: CharGrid, node: SceneNode, boxPositions: { row: number; col: number }[]): void {
  switch (node.type) {
    case 'box': return renderBox(grid, node, boxPositions);
    case 'card': return renderCard(grid, node, boxPositions);
    case 'table': return renderTable(grid, node, boxPositions);
    case 'hsplit': return renderHSplit(grid, node, boxPositions);
    case 'placeholder': return renderPlaceholder(grid, node, boxPositions);
    case 'button': return renderButton(grid, node);
    case 'checkbox': return renderCheckbox(grid, node);
    case 'radio': return renderRadio(grid, node);
    case 'input': return renderInput(grid, node);
    case 'dropdown': return renderDropdown(grid, node);
    case 'tabs': return renderTabs(grid, node);
    case 'nav': return renderNav(grid, node);
    case 'list': return renderList(grid, node);
    case 'modal': return renderModal(grid, node, boxPositions);
    case 'search': return renderSearch(grid, node);
    case 'toggle': return renderToggle(grid, node);
    case 'progress': return renderProgress(grid, node);
    case 'breadcrumb': return renderBreadcrumb(grid, node);
    case 'pagination': return renderPagination(grid, node);
    case 'line': return renderLine(grid, node, boxPositions);
    case 'arrow': return renderArrow(grid, node, boxPositions);
    case 'text': return renderText(grid, node);
    case 'stroke': return renderStroke(grid, node, boxPositions);
    case 'group': return; // handled by recursion in getZOrderedNodes
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function set(grid: CharGrid, row: number, col: number, char: string, boxPositions?: { row: number; col: number }[]): void {
  if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) {
    grid.setChar(row, col, char);
    if (boxPositions && isAnyBoxChar(char)) {
      boxPositions.push({ row, col });
    }
  }
}

// ── Box ──────────────────────────────────────────────────────────────────────

function renderBox(grid: CharGrid, node: BoxNode, bp: { row: number; col: number }[]): void {
  const { x, y, width, height } = node.bounds;
  if (height < 2 || width < 3) return;
  const maxR = y + height - 1;
  const maxC = x + width - 1;

  for (let c = x; c <= maxC; c++) {
    if (c === x) { set(grid, y, c, BOX.TL, bp); set(grid, maxR, c, BOX.BL, bp); }
    else if (c === maxC) { set(grid, y, c, BOX.TR, bp); set(grid, maxR, c, BOX.BR, bp); }
    else { set(grid, y, c, BOX.H, bp); set(grid, maxR, c, BOX.H, bp); }
  }
  for (let r = y + 1; r < maxR; r++) {
    set(grid, r, x, BOX.V, bp);
    set(grid, r, maxC, BOX.V, bp);
    for (let c = x + 1; c < maxC; c++) {
      set(grid, r, c, ' ');
    }
  }
}

// ── Card ─────────────────────────────────────────────────────────────────────

function renderCard(grid: CharGrid, node: CardNode, bp: { row: number; col: number }[]): void {
  const { x, y, width, height } = node.bounds;
  if (height < 3 || width < 6) return;
  const maxR = y + height - 1;
  const maxC = x + width - 1;
  const divR = y + 2;
  const hasDivider = divR < maxR;

  for (let r = y; r <= maxR; r++) {
    const isTop = r === y;
    const isBot = r === maxR;
    const isDiv = hasDivider && r === divR;

    for (let c = x; c <= maxC; c++) {
      const isLeft = c === x;
      const isRight = c === maxC;

      if (isTop) {
        if (isLeft) set(grid, r, c, BOX.TL, bp);
        else if (isRight) set(grid, r, c, BOX.TR, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isBot) {
        if (isLeft) set(grid, r, c, BOX.BL, bp);
        else if (isRight) set(grid, r, c, BOX.BR, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isDiv) {
        if (isLeft) set(grid, r, c, BOX.T_RIGHT, bp);
        else if (isRight) set(grid, r, c, BOX.T_LEFT, bp);
        else set(grid, r, c, BOX.H, bp);
      } else {
        if (isLeft || isRight) set(grid, r, c, BOX.V, bp);
        else set(grid, r, c, ' ');
      }
    }
  }

  // Title label
  const titleR = y + 1;
  const titleStart = x + 2;
  const title = node.title || 'Title';
  for (let i = 0; i < title.length && titleStart + i < maxC; i++) {
    set(grid, titleR, titleStart + i, title[i]);
  }
}

// ── Table ────────────────────────────────────────────────────────────────────

function renderTable(grid: CharGrid, node: TableNode, bp: { row: number; col: number }[]): void {
  const { x, y, width, height } = node.bounds;
  if (height < 3 || width < 8) return;
  const maxR = y + height - 1;
  const maxC = x + width - 1;
  const w = width - 1;

  // Compute column positions from columnWidths
  const colPositions: number[] = [x];
  const totalColW = node.columnWidths.reduce((a, b) => a + b, 0);
  let accum = 0;
  for (let i = 0; i < node.columnWidths.length - 1; i++) {
    accum += node.columnWidths[i];
    colPositions.push(x + Math.round((accum / totalColW) * w));
  }
  colPositions.push(maxC);

  const sepR = y + 2;
  const hasSep = sepR < maxR;

  for (let r = y; r <= maxR; r++) {
    const isTop = r === y;
    const isBot = r === maxR;
    const isSep = hasSep && r === sepR;

    for (let c = x; c <= maxC; c++) {
      const isLeft = c === x;
      const isRight = c === maxC;
      const isColBoundary = colPositions.includes(c) && !isLeft && !isRight;

      if (isTop) {
        if (isLeft) set(grid, r, c, BOX.TL, bp);
        else if (isRight) set(grid, r, c, BOX.TR, bp);
        else if (isColBoundary) set(grid, r, c, BOX.T_DOWN, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isBot) {
        if (isLeft) set(grid, r, c, BOX.BL, bp);
        else if (isRight) set(grid, r, c, BOX.BR, bp);
        else if (isColBoundary) set(grid, r, c, BOX.T_UP, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isSep) {
        if (isLeft) set(grid, r, c, BOX.T_RIGHT, bp);
        else if (isRight) set(grid, r, c, BOX.T_LEFT, bp);
        else if (isColBoundary) set(grid, r, c, BOX.CROSS, bp);
        else set(grid, r, c, BOX.H, bp);
      } else {
        if (isLeft || isRight || isColBoundary) set(grid, r, c, BOX.V, bp);
        else set(grid, r, c, ' ');
      }
    }
  }

  // Header labels
  const headerR = y + 1;
  const cols = node.columns;
  for (let i = 0; i < cols.length && i < colPositions.length - 1; i++) {
    const cStart = colPositions[i] + 2;
    const cEnd = colPositions[i + 1];
    const label = cols[i];
    for (let j = 0; j < label.length && cStart + j < cEnd; j++) {
      set(grid, headerR, cStart + j, label[j]);
    }
  }
}

// ── HSplit ────────────────────────────────────────────────────────────────────

function renderHSplit(grid: CharGrid, node: HSplitNode, bp: { row: number; col: number }[]): void {
  const { x, y, width, height } = node.bounds;
  if (height < 2 || width < 8) return;
  const maxR = y + height - 1;
  const maxC = x + width - 1;
  const divC = x + Math.round((width - 1) * node.ratio);

  for (let r = y; r <= maxR; r++) {
    const isTop = r === y;
    const isBot = r === maxR;

    for (let c = x; c <= maxC; c++) {
      const isLeft = c === x;
      const isRight = c === maxC;
      const isDiv = c === divC;

      if (isTop) {
        if (isLeft) set(grid, r, c, BOX.TL, bp);
        else if (isRight) set(grid, r, c, BOX.TR, bp);
        else if (isDiv) set(grid, r, c, BOX.T_DOWN, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isBot) {
        if (isLeft) set(grid, r, c, BOX.BL, bp);
        else if (isRight) set(grid, r, c, BOX.BR, bp);
        else if (isDiv) set(grid, r, c, BOX.T_UP, bp);
        else set(grid, r, c, BOX.H, bp);
      } else {
        if (isLeft || isRight || isDiv) set(grid, r, c, BOX.V, bp);
        else set(grid, r, c, ' ');
      }
    }
  }
}

// ── Placeholder ──────────────────────────────────────────────────────────────

function renderPlaceholder(grid: CharGrid, node: PlaceholderNode, bp: { row: number; col: number }[]): void {
  // Render as box first
  const { x, y, width, height } = node.bounds;
  if (height < 2 || width < 5) return;
  const maxR = y + height - 1;
  const maxC = x + width - 1;

  for (let r = y; r <= maxR; r++) {
    const isTop = r === y;
    const isBot = r === maxR;
    for (let c = x; c <= maxC; c++) {
      const isLeft = c === x;
      const isRight = c === maxC;
      if (isTop) {
        if (isLeft) set(grid, r, c, BOX.TL, bp);
        else if (isRight) set(grid, r, c, BOX.TR, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isBot) {
        if (isLeft) set(grid, r, c, BOX.BL, bp);
        else if (isRight) set(grid, r, c, BOX.BR, bp);
        else set(grid, r, c, BOX.H, bp);
      } else {
        if (isLeft || isRight) set(grid, r, c, BOX.V, bp);
        else set(grid, r, c, ' ');
      }
    }
  }

  // Center label
  const label = node.label || 'Content';
  const labelR = y + Math.floor((height - 1) / 2);
  const innerW = width - 2;
  const labelStart = x + 1 + Math.floor((innerW - label.length) / 2);
  for (let i = 0; i < label.length; i++) {
    const c = labelStart + i;
    if (c > x && c < maxC) set(grid, labelR, c, label[i]);
  }
}

// ── Button ───────────────────────────────────────────────────────────────────

function renderButton(grid: CharGrid, node: ButtonNode): void {
  const { x, y } = node.bounds;
  const label = node.label || 'OK';
  const str = `[ ${label} ]`;
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

function renderCheckbox(grid: CharGrid, node: CheckboxNode): void {
  const { x, y } = node.bounds;
  const marker = node.checked ? '☑' : '☐';
  const str = `${marker} ${node.label}`;
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Radio ────────────────────────────────────────────────────────────────────

function renderRadio(grid: CharGrid, node: RadioNode): void {
  const { x, y } = node.bounds;
  const marker = node.selected ? '●' : '○';
  const str = `${marker} ${node.label}`;
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Input ────────────────────────────────────────────────────────────────────

function renderInput(grid: CharGrid, node: InputNode): void {
  const { x, y, width } = node.bounds;
  set(grid, y, x, '[');
  set(grid, y, x + width - 1, ']');
  for (let c = x + 1; c < x + width - 1; c++) {
    set(grid, y, c, '_');
  }
}

// ── Dropdown ─────────────────────────────────────────────────────────────────

function renderDropdown(grid: CharGrid, node: DropdownNode): void {
  const { x, y } = node.bounds;
  const label = node.label || 'Option';
  const padded = label.padEnd(10, ' ');
  const str = `[▾ ${padded}]`;
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function renderTabs(grid: CharGrid, node: TabsNode): void {
  const { x, y } = node.bounds;
  const tabs = node.tabs.map((t, i) =>
    i === node.activeIndex ? `[ ${t} ]` : ` ${t}`
  );
  const line1 = tabs.join('  ');
  const lineWidth = Math.max(line1.length, 26);

  for (let i = 0; i < line1.length; i++) {
    set(grid, y, x + i, line1[i]);
  }
  for (let i = 0; i < lineWidth; i++) {
    set(grid, y + 1, x + i, '─');
  }
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function renderNav(grid: CharGrid, node: NavNode): void {
  const { x, y, width } = node.bounds;
  const maxC = x + width - 1;

  const content = [node.logo, ...node.links].join('   ');
  const action = `[ ${node.action} ]`;
  const actionStart = maxC - action.length + 1;

  // Place main content
  for (let i = 0; i < content.length && x + i <= maxC; i++) {
    set(grid, y, x + i, content[i]);
  }
  // Fill gap with spaces
  for (let c = x + content.length; c < actionStart && c <= maxC; c++) {
    set(grid, y, c, ' ');
  }
  // Place action button (right-aligned)
  if (actionStart > x + content.length) {
    for (let i = 0; i < action.length && actionStart + i <= maxC; i++) {
      set(grid, y, actionStart + i, action[i]);
    }
  }
  // Separator line
  for (let c = x; c <= maxC; c++) {
    set(grid, y + 1, c, '─');
  }
}

// ── List ─────────────────────────────────────────────────────────────────────

function renderList(grid: CharGrid, node: ListNode): void {
  const { x, y, width } = node.bounds;
  const maxC = x + width - 1;

  for (let i = 0; i < node.items.length; i++) {
    const line = `• ${node.items[i]}`;
    for (let j = 0; j < line.length && x + j <= maxC; j++) {
      set(grid, y + i, x + j, line[j]);
    }
    // Fill remaining width with spaces
    for (let c = x + line.length; c <= maxC; c++) {
      set(grid, y + i, c, ' ');
    }
  }
}

// ── Modal ────────────────────────────────────────────────────────────────────

function renderModal(grid: CharGrid, node: ModalNode, bp: { row: number; col: number }[]): void {
  const { x, y, width, height } = node.bounds;
  if (height < 4 || width < 10) return;
  const maxR = y + height - 1;
  const maxC = x + width - 1;

  // Draw box border
  for (let r = y; r <= maxR; r++) {
    const isTop = r === y;
    const isBot = r === maxR;
    for (let c = x; c <= maxC; c++) {
      const isLeft = c === x;
      const isRight = c === maxC;
      if (isTop) {
        if (isLeft) set(grid, r, c, BOX.TL, bp);
        else if (isRight) set(grid, r, c, BOX.TR, bp);
        else set(grid, r, c, BOX.H, bp);
      } else if (isBot) {
        if (isLeft) set(grid, r, c, BOX.BL, bp);
        else if (isRight) set(grid, r, c, BOX.BR, bp);
        else set(grid, r, c, BOX.H, bp);
      } else {
        if (isLeft || isRight) set(grid, r, c, BOX.V, bp);
        else set(grid, r, c, ' ');
      }
    }
  }

  // Title + close button on row y+1
  const title = node.title || 'Dialog';
  for (let i = 0; i < title.length && x + 2 + i < maxC; i++) {
    set(grid, y + 1, x + 2 + i, title[i]);
  }
  // Close X right-aligned
  if (width >= 6) set(grid, y + 1, maxC - 2, '×');

  // Title divider at y+2
  if (y + 2 < maxR) {
    set(grid, y + 2, x, BOX.T_RIGHT, bp);
    set(grid, y + 2, maxC, BOX.T_LEFT, bp);
    for (let c = x + 1; c < maxC; c++) {
      set(grid, y + 2, c, BOX.H, bp);
    }
  }

  // Action buttons on last interior row
  const btnRow = maxR - 1;
  if (btnRow > y + 2) {
    const ok = '[ OK ]';
    const cancel = '[ Cancel ]';
    const btns = `${cancel} ${ok}`;
    const btnStart = maxC - 1 - btns.length;
    if (btnStart > x) {
      for (let i = 0; i < btns.length; i++) {
        set(grid, btnRow, btnStart + i, btns[i]);
      }
    }
  }
}

// ── Search ───────────────────────────────────────────────────────────────────

function renderSearch(grid: CharGrid, node: SearchNode): void {
  const { x, y, width } = node.bounds;
  const placeholder = node.placeholder || 'Search...';
  // [/ placeholder      ]
  set(grid, y, x, '[');
  set(grid, y, x + 1, '/');
  set(grid, y, x + 2, ' ');
  const maxLabel = width - 4; // [/ ... ]
  for (let i = 0; i < placeholder.length && i < maxLabel; i++) {
    set(grid, y, x + 3 + i, placeholder[i]);
  }
  for (let c = x + 3 + Math.min(placeholder.length, maxLabel); c < x + width - 1; c++) {
    set(grid, y, c, ' ');
  }
  set(grid, y, x + width - 1, ']');
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function renderToggle(grid: CharGrid, node: ToggleNode): void {
  const { x, y } = node.bounds;
  const toggle = node.on ? '[━●]' : '[●━]';
  const str = `${toggle} ${node.label}`;
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Progress ─────────────────────────────────────────────────────────────────

function renderProgress(grid: CharGrid, node: ProgressNode): void {
  const { x, y, width } = node.bounds;
  const pct = Math.max(0, Math.min(100, node.value));
  const label = ` ${pct}%`;
  const barWidth = width - 2 - label.length; // [====....] XX%
  if (barWidth < 2) return;
  const filled = Math.round((pct / 100) * barWidth);
  set(grid, y, x, '[');
  for (let i = 0; i < barWidth; i++) {
    set(grid, y, x + 1 + i, i < filled ? '█' : '░');
  }
  set(grid, y, x + 1 + barWidth, ']');
  for (let i = 0; i < label.length; i++) {
    set(grid, y, x + 2 + barWidth + i, label[i]);
  }
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────

function renderBreadcrumb(grid: CharGrid, node: BreadcrumbNode): void {
  const { x, y } = node.bounds;
  const str = node.items.join(' > ');
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Pagination ───────────────────────────────────────────────────────────────

function renderPagination(grid: CharGrid, node: PaginationNode): void {
  const { x, y } = node.bounds;
  const cur = node.currentPage;
  const total = node.totalPages;

  // Build page numbers: < 1 2 [3] 4 5 >
  const parts: string[] = ['<'];
  const maxVisible = Math.min(total, 5);
  let startPage = Math.max(1, cur - 2);
  if (startPage + maxVisible - 1 > total) startPage = Math.max(1, total - maxVisible + 1);

  for (let p = startPage; p < startPage + maxVisible; p++) {
    parts.push(p === cur ? `[${p}]` : `${p}`);
  }
  if (startPage + maxVisible - 1 < total) parts.push('...');
  parts.push('>');

  const str = parts.join(' ');
  for (let i = 0; i < str.length; i++) {
    set(grid, y, x + i, str[i]);
  }
}

// ── Line ─────────────────────────────────────────────────────────────────────

function renderLine(grid: CharGrid, node: LineNode, bp: { row: number; col: number }[]): void {
  const cells = buildPolylineCells(node.points, false);
  for (const cell of cells) {
    set(grid, cell.row, cell.col, cell.char, bp);
  }
}

// ── Arrow ────────────────────────────────────────────────────────────────────

function renderArrow(grid: CharGrid, node: ArrowNode, bp: { row: number; col: number }[]): void {
  const cells = buildPolylineCells(node.points, true);
  for (const cell of cells) {
    set(grid, cell.row, cell.col, cell.char, bp);
  }
}

// ── Text ─────────────────────────────────────────────────────────────────────

function renderText(grid: CharGrid, node: TextNode): void {
  const { x, y, width } = node.bounds;
  const lines = node.content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length && j < width; j++) {
      set(grid, y + i, x + j, lines[i][j]);
    }
  }
}

// ── Stroke ───────────────────────────────────────────────────────────────────

function renderStroke(grid: CharGrid, node: StrokeNode, bp: { row: number; col: number }[]): void {
  const { x, y } = node.bounds;
  for (const cell of node.cells) {
    set(grid, y + cell.row, x + cell.col, cell.char, bp);
  }
}

// ── Junction resolution ──────────────────────────────────────────────────────

function resolveJunctions(grid: CharGrid, boxPositions: { row: number; col: number }[]): void {
  // Only resolve junctions at positions where box-drawing chars were placed
  // Deduplicate positions using a Set for O(1) lookup
  const seen = new Set<number>();
  for (const { row: r, col: c } of boxPositions) {
    const key = r * grid.cols + c;
    if (seen.has(key)) continue;
    seen.add(key);

    const ch = grid.getChar(r, c);
    if (!isAnyBoxChar(ch)) continue;

    const dirs = { up: false, down: false, left: false, right: false };
    if (r > 0) { const nd = getBoxDirs(grid.getChar(r - 1, c)); if (nd?.down) dirs.up = true; }
    if (r < grid.rows - 1) { const nd = getBoxDirs(grid.getChar(r + 1, c)); if (nd?.up) dirs.down = true; }
    if (c > 0) { const nd = getBoxDirs(grid.getChar(r, c - 1)); if (nd?.right) dirs.left = true; }
    if (c < grid.cols - 1) { const nd = getBoxDirs(grid.getChar(r, c + 1)); if (nd?.left) dirs.right = true; }

    // Orphan protection
    if (!dirs.up && !dirs.down && !dirs.left && !dirs.right) continue;

    const resolved = dirsToBoxChar(dirs);
    if (resolved !== ch) {
      grid.setChar(r, c, resolved);
    }
  }
}
