export const GRID_COLS = 80;
export const GRID_ROWS = 40;

export const FONT_FAMILY = 'JetBrains Mono, monospace';
export const FONT_SIZE = 14;

// Measured at runtime, but defaults for initial layout
export const DEFAULT_CELL_WIDTH = 8.4;
export const DEFAULT_CELL_HEIGHT = 18.2;

export const GRID_LINE_COLOR = '#e5e7eb';
export const GRID_BG_COLOR = '#ffffff';
export const CHAR_COLOR = '#2563eb';
export const CURSOR_COLOR = '#2563eb';
export const PREVIEW_COLOR = 'rgba(37, 99, 235, 0.35)';

export const MAX_UNDO = 50;

export const TOOL_IDS = [
  'select',
  'cursor',
  'box',
  'line',
  'arrow',
  'image',
  'button',
  'checkbox',
  'radio',
  'input',
  'dropdown',
  'eraser',
  'magic',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const GRID_PRESETS = [
  { label: 'Small (40x20)', cols: 40, rows: 20 },
  { label: 'Medium (80x40)', cols: 80, rows: 40 },
  { label: 'Large (120x60)', cols: 120, rows: 60 },
  { label: 'Wide (160x40)', cols: 160, rows: 40 },
  { label: 'Tall (80x80)', cols: 80, rows: 80 },
] as const;
