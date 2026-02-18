// Text editing utilities for all scene node types.
// Every node with user-facing text exposes it through a keyed "text region."
// Keys: 'label', 'title', 'content', 'placeholder', 'item-N', 'tab-N', 'link-N', 'col-N', 'logo', 'action'

import { SceneNode, Bounds } from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── Get editable text from a node by key ────────────────────────────────────

export function getNodeText(node: SceneNode, key: string): string | null {
  switch (node.type) {
    case 'button':
    case 'checkbox':
    case 'radio':
    case 'dropdown':
    case 'toggle':
      return key === 'label' ? node.label : null;
    case 'placeholder':
      return key === 'label' ? node.label : null;
    case 'input':
      return key === 'placeholder' ? node.placeholder : null;
    case 'search':
      return key === 'placeholder' ? node.placeholder : null;
    case 'card':
      return key === 'title' ? node.title : null;
    case 'modal':
      return key === 'title' ? node.title : null;
    case 'text':
      return key === 'content' ? node.content : null;
    case 'list': {
      const m = key.match(/^item-(\d+)$/);
      return m ? node.items[+m[1]] ?? null : null;
    }
    case 'tabs': {
      const m = key.match(/^tab-(\d+)$/);
      return m ? node.tabs[+m[1]] ?? null : null;
    }
    case 'nav': {
      if (key === 'logo') return node.logo;
      if (key === 'action') return node.action;
      const m = key.match(/^link-(\d+)$/);
      return m ? node.links[+m[1]] ?? null : null;
    }
    case 'breadcrumb': {
      const m = key.match(/^item-(\d+)$/);
      return m ? node.items[+m[1]] ?? null : null;
    }
    case 'table': {
      const m = key.match(/^col-(\d+)$/);
      return m ? node.columns[+m[1]] ?? null : null;
    }
    default:
      return null;
  }
}

// ── Set text on a node, returning update patch + reflowed bounds ─────────────

export function setNodeText(
  node: SceneNode, key: string, text: string
): { patch: Record<string, any>; bounds: Bounds } | null {
  const b = { ...node.bounds };

  switch (node.type) {
    case 'button':
      if (key !== 'label') return null;
      return { patch: { label: text }, bounds: { ...b, width: Math.max(4, text.length + 4) } };
    case 'checkbox':
    case 'radio':
      if (key !== 'label') return null;
      return { patch: { label: text }, bounds: { ...b, width: Math.max(2, text.length + 2) } };
    case 'dropdown':
      if (key !== 'label') return null;
      return { patch: { label: text }, bounds: { ...b, width: text.padEnd(10, ' ').length + 4 } };
    case 'toggle':
      if (key !== 'label') return null;
      return { patch: { label: text }, bounds: { ...b, width: Math.max(5, text.length + 5) } };
    case 'placeholder':
      if (key !== 'label') return null;
      return { patch: { label: text }, bounds: { ...b, width: Math.max(b.width, text.length + 4) } };
    case 'input':
      if (key !== 'placeholder') return null;
      return { patch: { placeholder: text }, bounds: b };
    case 'search':
      if (key !== 'placeholder') return null;
      return { patch: { placeholder: text }, bounds: b };
    case 'card':
      if (key !== 'title') return null;
      return { patch: { title: text }, bounds: { ...b, width: Math.max(b.width, text.length + 4) } };
    case 'modal':
      if (key !== 'title') return null;
      return { patch: { title: text }, bounds: { ...b, width: Math.max(b.width, text.length + 6) } };
    case 'text': {
      if (key !== 'content') return null;
      const lines = text.split('\n');
      const maxW = Math.max(...lines.map(l => l.length), 1);
      return { patch: { content: text }, bounds: { ...b, width: Math.max(maxW, 1), height: Math.max(lines.length, 1) } };
    }
    case 'list': {
      const m = key.match(/^item-(\d+)$/);
      if (!m) return null;
      const idx = +m[1];
      if (idx >= node.items.length) return null;
      const items = [...node.items];
      items[idx] = text;
      const maxW = Math.max(...items.map(s => s.length + 2));
      return { patch: { items }, bounds: { ...b, width: Math.max(b.width, maxW) } };
    }
    case 'tabs': {
      const m = key.match(/^tab-(\d+)$/);
      if (!m) return null;
      const idx = +m[1];
      if (idx >= node.tabs.length) return null;
      const tabs = [...node.tabs];
      tabs[idx] = text;
      const line = tabs.map((t, i) => i === node.activeIndex ? `[ ${t} ]` : ` ${t}`).join('  ');
      return { patch: { tabs }, bounds: { ...b, width: Math.max(b.width, line.length) } };
    }
    case 'nav': {
      if (key === 'logo') {
        const content = [text, ...node.links].join('   ');
        const action = `[ ${node.action} ]`;
        const w = Math.max(b.width, content.length + 3 + action.length);
        return { patch: { logo: text }, bounds: { ...b, width: w } };
      }
      if (key === 'action') {
        return { patch: { action: text }, bounds: b };
      }
      const lm = key.match(/^link-(\d+)$/);
      if (lm) {
        const idx = +lm[1];
        if (idx >= node.links.length) return null;
        const links = [...node.links];
        links[idx] = text;
        const content = [node.logo, ...links].join('   ');
        const action = `[ ${node.action} ]`;
        const w = Math.max(b.width, content.length + 3 + action.length);
        return { patch: { links }, bounds: { ...b, width: w } };
      }
      return null;
    }
    case 'breadcrumb': {
      const m = key.match(/^item-(\d+)$/);
      if (!m) return null;
      const idx = +m[1];
      if (idx >= node.items.length) return null;
      const items = [...node.items];
      items[idx] = text;
      const str = items.join(' > ');
      return { patch: { items }, bounds: { ...b, width: str.length } };
    }
    case 'table': {
      const m = key.match(/^col-(\d+)$/);
      if (!m) return null;
      const idx = +m[1];
      if (idx >= node.columns.length) return null;
      const columns = [...node.columns];
      columns[idx] = text;
      return { patch: { columns }, bounds: b };
    }
    default:
      return null;
  }
}

// ── Detect which text region was clicked ─────────────────────────────────────

export function detectTextRegion(
  node: SceneNode, row: number, col: number
): { key: string; cursorPos: number } | null {
  const { x, y } = node.bounds;
  const relRow = row - y;
  const relCol = col - x;

  switch (node.type) {
    case 'button':
      return { key: 'label', cursorPos: clamp(relCol - 2, 0, node.label.length) };
    case 'checkbox':
    case 'radio':
      return { key: 'label', cursorPos: clamp(relCol - 2, 0, node.label.length) };
    case 'dropdown':
      return { key: 'label', cursorPos: clamp(relCol - 3, 0, node.label.length) };
    case 'toggle':
      return { key: 'label', cursorPos: clamp(relCol - 5, 0, node.label.length) };
    case 'input':
      return { key: 'placeholder', cursorPos: clamp(relCol - 1, 0, node.placeholder.length) };
    case 'search':
      return { key: 'placeholder', cursorPos: clamp(relCol - 3, 0, node.placeholder.length) };
    case 'card':
      return { key: 'title', cursorPos: relRow === 1 ? clamp(relCol - 2, 0, node.title.length) : node.title.length };
    case 'modal':
      return { key: 'title', cursorPos: relRow === 1 ? clamp(relCol - 2, 0, node.title.length) : node.title.length };
    case 'placeholder':
      return { key: 'label', cursorPos: clamp(relCol, 0, node.label.length) };
    case 'text': {
      const lines = node.content.split('\n');
      const lineIdx = clamp(relRow, 0, lines.length - 1);
      let pos = 0;
      for (let i = 0; i < lineIdx; i++) pos += lines[i].length + 1;
      pos += clamp(relCol, 0, (lines[lineIdx] || '').length);
      return { key: 'content', cursorPos: pos };
    }
    case 'list': {
      const idx = clamp(relRow, 0, node.items.length - 1);
      return { key: `item-${idx}`, cursorPos: clamp(relCol - 2, 0, node.items[idx]?.length ?? 0) };
    }
    case 'tabs': {
      let offset = 0;
      for (let i = 0; i < node.tabs.length; i++) {
        const tabStr = i === node.activeIndex ? `[ ${node.tabs[i]} ]` : ` ${node.tabs[i]}`;
        const gap = i < node.tabs.length - 1 ? 2 : 0;
        if (relCol < offset + tabStr.length + gap) {
          const inner = i === node.activeIndex ? 2 : 1;
          return { key: `tab-${i}`, cursorPos: clamp(relCol - offset - inner, 0, node.tabs[i].length) };
        }
        offset += tabStr.length + gap;
      }
      {
        const idx = Math.max(0, Math.min(node.activeIndex, node.tabs.length - 1));
        if (node.tabs.length === 0) return null;
        return { key: `tab-${idx}`, cursorPos: node.tabs[idx]?.length ?? 0 };
      }
    }
    case 'nav': {
      if (relRow !== 0) return { key: 'logo', cursorPos: node.logo.length };
      let offset = 0;
      if (relCol < node.logo.length + 3) return { key: 'logo', cursorPos: clamp(relCol, 0, node.logo.length) };
      offset = node.logo.length + 3;
      for (let i = 0; i < node.links.length; i++) {
        if (relCol < offset + node.links[i].length + 3) {
          return { key: `link-${i}`, cursorPos: clamp(relCol - offset, 0, node.links[i].length) };
        }
        offset += node.links[i].length + 3;
      }
      return { key: 'action', cursorPos: node.action.length };
    }
    case 'breadcrumb': {
      let offset = 0;
      for (let i = 0; i < node.items.length; i++) {
        const sep = i < node.items.length - 1 ? 3 : 0;
        if (relCol < offset + node.items[i].length + sep) {
          return { key: `item-${i}`, cursorPos: clamp(relCol - offset, 0, node.items[i].length) };
        }
        offset += node.items[i].length + sep;
      }
      const last = node.items.length - 1;
      return { key: `item-${last}`, cursorPos: node.items[last]?.length ?? 0 };
    }
    case 'table': {
      if (relRow !== 1) return null;
      const w = node.bounds.width - 1;
      const totalColW = node.columnWidths.reduce((a, b) => a + b, 0);
      let accum = 0;
      for (let i = 0; i < node.columns.length; i++) {
        const colStart = Math.round((accum / totalColW) * w) + 2;
        const nextAccum = accum + node.columnWidths[i];
        const colEnd = i < node.columns.length - 1 ? Math.round((nextAccum / totalColW) * w) : w;
        if (relCol >= colStart && relCol < colEnd) {
          return { key: `col-${i}`, cursorPos: clamp(relCol - colStart, 0, node.columns[i].length) };
        }
        accum = nextAccum;
      }
      return null;
    }
    default:
      return null;
  }
}

// ── Cursor grid position during editing ─────────────────────────────────────

export function getTextCursorGridPos(
  node: SceneNode, key: string, cursorPos: number
): { row: number; col: number } | null {
  const { x, y } = node.bounds;

  switch (node.type) {
    case 'button': return { row: y, col: x + 2 + cursorPos };
    case 'checkbox':
    case 'radio': return { row: y, col: x + 2 + cursorPos };
    case 'dropdown': return { row: y, col: x + 3 + cursorPos };
    case 'toggle': return { row: y, col: x + 5 + cursorPos };
    case 'input': return { row: y, col: x + 1 + cursorPos };
    case 'search': return { row: y, col: x + 3 + cursorPos };
    case 'card': return { row: y + 1, col: x + 2 + cursorPos };
    case 'modal': return { row: y + 1, col: x + 2 + cursorPos };
    case 'placeholder': {
      const innerW = node.bounds.width - 2;
      const text = node.label || '';
      const start = x + 1 + Math.floor((innerW - text.length) / 2);
      return { row: y + Math.floor((node.bounds.height - 1) / 2), col: start + cursorPos };
    }
    case 'text': {
      const lines = node.content.split('\n');
      let rem = cursorPos;
      for (let i = 0; i < lines.length; i++) {
        if (rem <= lines[i].length) return { row: y + i, col: x + rem };
        rem -= lines[i].length + 1;
      }
      return { row: y + lines.length - 1, col: x + (lines[lines.length - 1]?.length ?? 0) };
    }
    case 'list': {
      const m = key.match(/^item-(\d+)$/);
      return m ? { row: y + +m[1], col: x + 2 + cursorPos } : null;
    }
    case 'tabs': {
      const m = key.match(/^tab-(\d+)$/);
      if (!m) return null;
      const idx = +m[1];
      let offset = 0;
      for (let i = 0; i < idx; i++) {
        const s = i === node.activeIndex ? `[ ${node.tabs[i]} ]` : ` ${node.tabs[i]}`;
        offset += s.length + 2;
      }
      const inner = idx === node.activeIndex ? 2 : 1;
      return { row: y, col: x + offset + inner + cursorPos };
    }
    case 'nav': {
      if (key === 'logo') return { row: y, col: x + cursorPos };
      if (key === 'action') {
        const action = `[ ${node.action} ]`;
        const start = x + node.bounds.width - action.length + 2;
        return { row: y, col: start + cursorPos };
      }
      const lm = key.match(/^link-(\d+)$/);
      if (lm) {
        let offset = node.logo.length + 3;
        for (let i = 0; i < +lm[1]; i++) {
          if (i >= node.links.length || !node.links[i]) break;
          offset += node.links[i].length + 3;
        }
        return { row: y, col: x + offset + cursorPos };
      }
      return null;
    }
    case 'breadcrumb': {
      const m = key.match(/^item-(\d+)$/);
      if (!m) return null;
      let offset = 0;
      for (let i = 0; i < +m[1]; i++) {
        if (i >= node.items.length || !node.items[i]) break;
        offset += node.items[i].length + 3;
      }
      return { row: y, col: x + offset + cursorPos };
    }
    case 'table': {
      const m = key.match(/^col-(\d+)$/);
      if (!m) return null;
      const idx = +m[1];
      const w = node.bounds.width - 1;
      const totalColW = node.columnWidths.reduce((a, b) => a + b, 0);
      let accum = 0;
      for (let i = 0; i < idx; i++) accum += node.columnWidths[i];
      const colStart = Math.round((accum / totalColW) * w) + 2;
      return { row: y + 1, col: x + colStart + cursorPos };
    }
    default:
      return null;
  }
}

// ── Move cursor within text ─────────────────────────────────────────────────

export function moveTextCursor(
  node: SceneNode, key: string, cursorPos: number,
  direction: 'left' | 'right' | 'up' | 'down'
): number {
  const text = getNodeText(node, key);
  if (text === null) return cursorPos;
  cursorPos = Math.max(0, Math.min(text.length, cursorPos));

  if (direction === 'left') return Math.max(0, cursorPos - 1);
  if (direction === 'right') return Math.min(text.length, cursorPos + 1);

  // Up/Down: multiline text only
  if (node.type !== 'text' || key !== 'content') return cursorPos;

  const lines = text.split('\n');
  let currentLine = 0, currentCol = 0, rem = cursorPos;
  for (let i = 0; i < lines.length; i++) {
    if (rem <= lines[i].length) { currentLine = i; currentCol = rem; break; }
    rem -= lines[i].length + 1;
  }

  const targetLine = direction === 'up' ? currentLine - 1 : currentLine + 1;
  if (targetLine < 0 || targetLine >= lines.length) return cursorPos;

  const targetCol = Math.min(currentCol, lines[targetLine].length);
  let pos = 0;
  for (let i = 0; i < targetLine; i++) pos += lines[i].length + 1;
  return pos + targetCol;
}

// ── Primary text key per node type (for click-to-place auto-editing) ────────

export function getPrimaryTextKey(nodeType: string): string | null {
  switch (nodeType) {
    case 'button':
    case 'checkbox':
    case 'radio':
    case 'dropdown':
    case 'toggle':
    case 'placeholder':
      return 'label';
    case 'input':
    case 'search':
      return 'placeholder';
    case 'card':
    case 'modal':
      return 'title';
    case 'text':
      return 'content';
    case 'tabs':
      return 'tab-0';
    default:
      return null;
  }
}
