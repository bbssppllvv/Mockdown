// Fallback grid size when window is unavailable (SSR)
export const GRID_COLS = 80;
export const GRID_ROWS = 40;

/**
 * Compute optimal grid dimensions to fill the available viewport.
 * Desktop: subtracts left toolbar (192px), right inspector (280px) and status bar (~30px).
 * Mobile: subtracts bottom toolbar (88px) + safe area (~34px).
 * Returns cols/rows clamped to [20..300] x [10..200].
 */
export function computeAutoGridSize(
  cellWidth = DEFAULT_CELL_WIDTH,
  cellHeight = DEFAULT_CELL_HEIGHT,
): { cols: number; rows: number } {
  if (typeof window === 'undefined') return { cols: GRID_COLS, rows: GRID_ROWS };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768;

  const availableWidth = isMobile ? vw - 16 : vw - 472;
  // Status bar ~30px on desktop; bottom toolbar 88px + safe area ~34px on mobile
  const availableHeight = isMobile ? vh - 122 : vh - 30;

  const cols = Math.max(20, Math.min(300, Math.floor(availableWidth / cellWidth)));
  const rows = Math.max(10, Math.min(200, Math.floor(availableHeight / cellHeight)));

  return { cols, rows };
}

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

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  gridBg: string;
  gridLine: string;
  char: string;
  cursor: string;
  accentRgb: string; // "r, g, b" for rgba() usage
  dark: boolean;
}

export const LIGHT_COLORS: ThemeColors = {
  gridBg: '#ffffff',
  gridLine: '#e5e7eb',
  char: '#2563eb',
  cursor: '#2563eb',
  accentRgb: '37, 99, 235',
  dark: false,
};

export const DARK_COLORS: ThemeColors = {
  gridBg: '#1a1a1a',
  gridLine: '#2d2d2d',
  char: '#60a5fa',
  cursor: '#60a5fa',
  accentRgb: '96, 165, 250',
  dark: true,
};

export const MAX_UNDO = 50;

export const TOOL_IDS = [
  'select',
  'text',
  'box',
  'line',
  'arrow',
  'image',
  'card',
  'table',
  'hsplit',
  'nav',
  'tabs',
  'list',
  'placeholder',
  'modal',
  'pencil',
  'brush',
  'spray',
  'shade',
  'fill',
  'eraser',
  'smudge',
  'scatter',
  'button',
  'checkbox',
  'radio',
  'input',
  'dropdown',
  'search',
  'toggle',
  'progress',
  'breadcrumb',
  'pagination',
  'generate',
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const GRID_PRESETS = [
  { label: 'Mobile (60x40)', cols: 60, rows: 40 },
  { label: 'Small (40x20)', cols: 40, rows: 20 },
  { label: 'Medium (80x40)', cols: 80, rows: 40 },
  { label: 'Large (120x60)', cols: 120, rows: 60 },
  { label: 'Wide (160x40)', cols: 160, rows: 40 },
  { label: 'Tall (80x80)', cols: 80, rows: 80 },
] as const;
