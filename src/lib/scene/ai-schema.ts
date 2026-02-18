// AI generation schema — Zod schema for streamObject + validation/fixup
import { z } from 'zod';
import { NewNodeData, Bounds } from './types';

// ── Supported UI types for AI generation ────────────────────────────────────
const UI_TYPES = [
  'box', 'card', 'table', 'hsplit', 'placeholder', 'button', 'input',
  'dropdown', 'checkbox', 'radio', 'toggle', 'search', 'tabs', 'nav',
  'list', 'modal', 'progress', 'breadcrumb', 'pagination', 'text',
] as const;

export type AINodeType = (typeof UI_TYPES)[number];

// ── Flat Zod schema (LLMs work best with flat objects, not oneOf/anyOf) ─────
export const wireframeNodeSchema = z.object({
  type: z.enum(UI_TYPES),
  x: z.number().int().describe('Column position (0 = left edge)'),
  y: z.number().int().describe('Row position (0 = top edge)'),
  width: z.number().int().describe('Width in columns'),
  height: z.number().int().describe('Height in rows'),

  // Optional fields used by specific node types
  label: z.string().optional().describe('For button, checkbox, radio, toggle, dropdown, placeholder'),
  title: z.string().optional().describe('For card, modal'),
  placeholder: z.string().optional().describe('For input, search'),
  content: z.string().optional().describe('For text node'),
  checked: z.boolean().optional().describe('For checkbox'),
  selected: z.boolean().optional().describe('For radio'),
  on: z.boolean().optional().describe('For toggle'),
  value: z.number().optional().describe('For progress (0-100)'),
  ratio: z.number().optional().describe('For hsplit (0-1)'),
  columns: z.array(z.string()).optional().describe('For table header columns'),
  columnWidths: z.array(z.number()).optional().describe('For table column widths'),
  rowCount: z.number().int().optional().describe('For table'),
  tabs: z.array(z.string()).optional().describe('For tabs'),
  activeIndex: z.number().int().optional().describe('For tabs'),
  items: z.array(z.string()).optional().describe('For list, breadcrumb'),
  logo: z.string().optional().describe('For nav'),
  links: z.array(z.string()).optional().describe('For nav'),
  action: z.string().optional().describe('For nav'),
  currentPage: z.number().int().optional().describe('For pagination'),
  totalPages: z.number().int().optional().describe('For pagination'),
});

export type AINodeRaw = z.infer<typeof wireframeNodeSchema>;

// ── Minimum sizes from renderer.ts ──────────────────────────────────────────
const MIN_SIZES: Record<string, { w: number; h: number }> = {
  box: { w: 3, h: 2 },
  card: { w: 6, h: 3 },
  table: { w: 8, h: 3 },
  hsplit: { w: 8, h: 2 },
  placeholder: { w: 5, h: 2 },
  modal: { w: 10, h: 4 },
  button: { w: 6, h: 1 },
  input: { w: 5, h: 1 },
  dropdown: { w: 8, h: 1 },
  checkbox: { w: 4, h: 1 },
  radio: { w: 4, h: 1 },
  toggle: { w: 6, h: 1 },
  search: { w: 8, h: 1 },
  tabs: { w: 10, h: 2 },
  nav: { w: 10, h: 2 },
  list: { w: 4, h: 1 },
  progress: { w: 10, h: 1 },
  breadcrumb: { w: 5, h: 1 },
  pagination: { w: 10, h: 1 },
  text: { w: 1, h: 1 },
};

// ── Validate and fix a raw AI node into a NewNodeData ───────────────────────
export function validateAndFixNode(
  raw: AINodeRaw,
  areaWidth: number,
  areaHeight: number,
): NewNodeData | null {
  const { type } = raw;
  if (!UI_TYPES.includes(type)) return null;

  const minSize = MIN_SIZES[type] ?? { w: 1, h: 1 };

  // Build bounds, clamp to generation area
  let x = Math.max(0, Math.min(raw.x ?? 0, areaWidth - 1));
  let y = Math.max(0, Math.min(raw.y ?? 0, areaHeight - 1));
  let width = Math.max(minSize.w, raw.width ?? minSize.w);
  let height = Math.max(minSize.h, raw.height ?? minSize.h);

  // Clamp to fit within the area
  if (x + width > areaWidth) width = Math.max(minSize.w, areaWidth - x);
  if (y + height > areaHeight) height = Math.max(minSize.h, areaHeight - y);
  // If still overflows, shift position
  if (x + width > areaWidth) x = Math.max(0, areaWidth - width);
  if (y + height > areaHeight) y = Math.max(0, areaHeight - height);

  const bounds: Bounds = { x, y, width, height };

  // Build the correct NewNodeData based on type
  switch (type) {
    case 'box':
      return { type: 'box', name: 'Box', bounds };

    case 'card':
      return { type: 'card', name: 'Card', bounds, title: raw.title || 'Title' };

    case 'table': {
      const columns = raw.columns?.length ? raw.columns : ['Col 1', 'Col 2', 'Col 3'];
      const colCount = columns.length;
      const columnWidths = raw.columnWidths?.length === colCount
        ? raw.columnWidths
        : columns.map(() => Math.floor(width / colCount));
      const rowCount = raw.rowCount ?? Math.max(1, height - 2);
      return { type: 'table', name: 'Table', bounds, columns, columnWidths, rowCount };
    }

    case 'hsplit':
      return { type: 'hsplit', name: 'HSplit', bounds, ratio: Math.max(0.1, Math.min(0.9, raw.ratio ?? 0.5)) };

    case 'placeholder':
      return { type: 'placeholder', name: 'Placeholder', bounds, label: raw.label || 'Content' };

    case 'button': {
      const label = raw.label || 'OK';
      const btnW = Math.max(label.length + 4, width);
      return { type: 'button', name: 'Button', bounds: { ...bounds, width: btnW, height: 1 }, label };
    }

    case 'input': {
      const inputW = Math.max(5, width);
      return { type: 'input', name: 'Input', bounds: { ...bounds, width: inputW, height: 1 }, placeholder: raw.placeholder || '' };
    }

    case 'dropdown': {
      const dlabel = raw.label || 'Option';
      const dw = Math.max(dlabel.length + 5, 8, width);
      return { type: 'dropdown', name: 'Dropdown', bounds: { ...bounds, width: dw, height: 1 }, label: dlabel };
    }

    case 'checkbox': {
      const clabel = raw.label || 'Option';
      const cw = Math.max(clabel.length + 2, width);
      return { type: 'checkbox', name: 'Checkbox', bounds: { ...bounds, width: cw, height: 1 }, label: clabel, checked: raw.checked ?? false };
    }

    case 'radio': {
      const rlabel = raw.label || 'Option';
      const rw = Math.max(rlabel.length + 2, width);
      return { type: 'radio', name: 'Radio', bounds: { ...bounds, width: rw, height: 1 }, label: rlabel, selected: raw.selected ?? false };
    }

    case 'toggle': {
      const tlabel = raw.label || 'Toggle';
      const tw = Math.max(tlabel.length + 5, width);
      return { type: 'toggle', name: 'Toggle', bounds: { ...bounds, width: tw, height: 1 }, label: tlabel, on: raw.on ?? false };
    }

    case 'search': {
      const sw = Math.max(8, width);
      return { type: 'search', name: 'Search', bounds: { ...bounds, width: sw, height: 1 }, placeholder: raw.placeholder || 'Search...' };
    }

    case 'tabs': {
      const tabs = raw.tabs?.length ? raw.tabs : ['Tab 1', 'Tab 2', 'Tab 3'];
      const activeIndex = Math.max(0, Math.min((raw.activeIndex ?? 0), tabs.length - 1));
      return { type: 'tabs', name: 'Tabs', bounds: { ...bounds, height: 2 }, tabs, activeIndex };
    }

    case 'nav': {
      const logo = raw.logo || 'Logo';
      const links = raw.links?.length ? raw.links : ['Link'];
      const action = raw.action || 'CTA';
      return { type: 'nav', name: 'Nav', bounds: { ...bounds, height: 2 }, logo, links, action };
    }

    case 'list': {
      const items = raw.items?.length ? raw.items : ['Item 1', 'Item 2'];
      return { type: 'list', name: 'List', bounds: { ...bounds, height: items.length }, items };
    }

    case 'modal':
      return { type: 'modal', name: 'Modal', bounds, title: raw.title || 'Dialog' };

    case 'progress':
      return { type: 'progress', name: 'Progress', bounds: { ...bounds, height: 1 }, value: Math.max(0, Math.min(100, raw.value ?? 50)) };

    case 'breadcrumb': {
      const bitems = raw.items?.length ? raw.items : ['Home', 'Page'];
      const bw = Math.max(bitems.join(' > ').length, width);
      return { type: 'breadcrumb', name: 'Breadcrumb', bounds: { ...bounds, width: bw, height: 1 }, items: bitems };
    }

    case 'pagination': {
      const curPage = raw.currentPage ?? 1;
      const totalPages = raw.totalPages ?? 5;
      return { type: 'pagination', name: 'Pagination', bounds: { ...bounds, height: 1 }, currentPage: curPage, totalPages };
    }

    case 'text':
      return { type: 'text', name: 'Text', bounds, content: raw.content || 'Text' };

    default:
      return null;
  }
}
