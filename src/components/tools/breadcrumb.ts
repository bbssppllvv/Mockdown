import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';

const DEFAULT_ITEMS = ['Home', 'Section', 'Page'];

function buildBreadcrumbPreview(row: number, col: number, items: string[]): PreviewCell[] {
  const str = items.join(' > ');
  const cells: PreviewCell[] = [];
  for (let i = 0; i < str.length; i++) {
    cells.push({ row, col: col + i, char: str[i] });
  }
  return cells;
}

function itemsForWidth(width: number): string[] {
  // Responsive: more width → more breadcrumb levels
  if (width < 20) return ['Home', 'Page'];
  if (width < 35) return ['Home', 'Section', 'Page'];
  return ['Home', 'Products', 'Category', 'Detail'];
}

export const breadcrumbTool: DrawingTool = {
  id: 'breadcrumb',
  label: 'Breadcrumb',
  icon: 'ChevronRight',

  onClick(pos: GridPos): ToolResult {
    const str = DEFAULT_ITEMS.join(' > ');
    return {
      kind: 'create',
      node: {
        type: 'breadcrumb',
        name: 'Breadcrumb',
        bounds: { x: pos.col, y: pos.row, width: str.length, height: 1 },
        items: DEFAULT_ITEMS,
      },
    };
  },

  onDragStart(): PreviewCell[] | null { return []; },

  onDrag(start: GridPos, current: GridPos): PreviewCell[] | null {
    const minR = Math.min(start.row, current.row);
    const minC = Math.min(start.col, current.col);
    const maxC = Math.max(start.col, current.col);
    const dragW = maxC - minC + 1;
    const items = dragW <= 1 ? DEFAULT_ITEMS : itemsForWidth(dragW);
    return buildBreadcrumbPreview(minR, minC, items);
  },

  onDragEnd(start: GridPos, end: GridPos): ToolResult {
    const minR = Math.min(start.row, end.row);
    const minC = Math.min(start.col, end.col);
    const maxC = Math.max(start.col, end.col);
    const dragW = maxC - minC + 1;
    const items = dragW < 3 ? DEFAULT_ITEMS : itemsForWidth(dragW);
    const str = items.join(' > ');
    const w = Math.max(dragW, str.length);

    return {
      kind: 'create',
      node: {
        type: 'breadcrumb',
        name: 'Breadcrumb',
        bounds: { x: minC, y: minR, width: w, height: 1 },
        items,
      },
    };
  },
};
