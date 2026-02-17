import { DrawingTool, GridPos, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';

const FILL_CHAR = '\u2588';
const MAX_FILL = 5000;

function floodFill(grid: CharGrid, startRow: number, startCol: number): SparseCell[] {
  const target = grid.getChar(startRow, startCol);
  if (target === FILL_CHAR) return [];

  const cells: SparseCell[] = [];
  const visited = new Set<string>();
  const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0 && cells.length < MAX_FILL) {
    const { row, col } = queue.shift()!;
    cells.push({ row, col, char: FILL_CHAR });

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = row + dr;
      const nc = col + dc;
      const key = `${nr},${nc}`;
      if (nr >= 0 && nr < grid.rows && nc >= 0 && nc < grid.cols && !visited.has(key)) {
        visited.add(key);
        if (grid.getChar(nr, nc) === target) {
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }

  return cells;
}

export const fillTool: DrawingTool = {
  id: 'fill',
  label: 'Fill',
  icon: 'PaintBucket',

  onClick(pos: GridPos, grid: CharGrid): ToolResult {
    const cells = floodFill(grid, pos.row, pos.col);
    if (cells.length === 0) return null;

    // Compute bounds from the filled cells
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const c of cells) {
      if (c.row < minR) minR = c.row;
      if (c.row > maxR) maxR = c.row;
      if (c.col < minC) minC = c.col;
      if (c.col > maxC) maxC = c.col;
    }

    // Convert cells to be relative to bounds origin
    const relativeCells: SparseCell[] = cells.map(c => ({
      row: c.row - minR,
      col: c.col - minC,
      char: c.char,
    }));

    return {
      kind: 'create',
      node: {
        type: 'stroke',
        name: 'Fill',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        cells: relativeCells,
      },
    };
  },
};
