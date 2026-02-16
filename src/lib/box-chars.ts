// Unicode box-drawing characters (always output these)
export const BOX = {
  TL: '┌', TR: '┐', BL: '└', BR: '┘',
  H: '─', V: '│',
  T_DOWN: '┬', T_UP: '┴', T_RIGHT: '├', T_LEFT: '┤', CROSS: '┼',
} as const;

// Detection helpers (recognize both old ASCII and new Unicode)
export function isBoxCorner(ch: string) { return ch === '┌' || ch === '┐' || ch === '└' || ch === '┘' || ch === '+'; }
export function isBoxHorizontal(ch: string) { return ch === '─' || ch === '-'; }
export function isBoxVertical(ch: string) { return ch === '│' || ch === '|'; }
export function isBoxEdge(ch: string) { return isBoxCorner(ch) || isBoxHorizontal(ch) || isBoxVertical(ch); }
