import { CharGrid } from './grid-model';
import { ObjectBounds } from './object-detection';
import { PreviewCell } from '@/components/tools/types';
import { BOX } from './box-chars';

export type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * Check if a position is inside the given bounds (inclusive).
 */
export function isInsideBounds(row: number, col: number, bounds: ObjectBounds): boolean {
  return row >= bounds.minRow && row <= bounds.maxRow &&
         col >= bounds.minCol && col <= bounds.maxCol;
}

/**
 * Hit-test corner handles of a box selection (2-cell tolerance).
 */
export function hitTestCornerHandle(
  row: number,
  col: number,
  bounds: ObjectBounds
): ResizeCorner | null {
  const tolerance = 1;

  const nearTop = Math.abs(row - bounds.minRow) <= tolerance;
  const nearBottom = Math.abs(row - bounds.maxRow) <= tolerance;
  const nearLeft = Math.abs(col - bounds.minCol) <= tolerance;
  const nearRight = Math.abs(col - bounds.maxCol) <= tolerance;

  if (nearTop && nearLeft) return 'top-left';
  if (nearTop && nearRight) return 'top-right';
  if (nearBottom && nearLeft) return 'bottom-left';
  if (nearBottom && nearRight) return 'bottom-right';

  return null;
}

/**
 * Offset bounds by a row/col delta.
 */
export function offsetBounds(bounds: ObjectBounds, dRow: number, dCol: number): ObjectBounds {
  return {
    minRow: bounds.minRow + dRow,
    maxRow: bounds.maxRow + dRow,
    minCol: bounds.minCol + dCol,
    maxCol: bounds.maxCol + dCol,
  };
}

/**
 * Extract all characters within bounds as a 2D array.
 */
function extractBlock(grid: CharGrid, bounds: ObjectBounds): string[][] {
  const height = bounds.maxRow - bounds.minRow + 1;
  const width = bounds.maxCol - bounds.minCol + 1;
  const block: string[][] = [];
  for (let r = 0; r < height; r++) {
    const row: string[] = [];
    for (let c = 0; c < width; c++) {
      row.push(grid.getChar(bounds.minRow + r, bounds.minCol + c));
    }
    block.push(row);
  }
  return block;
}

/**
 * Build preview cells for moving an object.
 */
export function buildMovePreview(
  grid: CharGrid,
  originalBounds: ObjectBounds,
  dRow: number,
  dCol: number
): PreviewCell[] {
  const block = extractBlock(grid, originalBounds);
  const cells: PreviewCell[] = [];

  for (let r = 0; r < block.length; r++) {
    for (let c = 0; c < block[r].length; c++) {
      const newRow = originalBounds.minRow + r + dRow;
      const newCol = originalBounds.minCol + c + dCol;
      if (newRow >= 0 && newRow < grid.rows && newCol >= 0 && newCol < grid.cols) {
        cells.push({ row: newRow, col: newCol, char: block[r][c] });
      }
    }
  }

  return cells;
}

/**
 * Apply a move operation to the grid.
 * Returns the new bounds after moving.
 */
export function applyMove(
  grid: CharGrid,
  originalBounds: ObjectBounds,
  dRow: number,
  dCol: number
): ObjectBounds {
  const block = extractBlock(grid, originalBounds);

  // Clear old region
  grid.clearRegion(
    originalBounds.minRow,
    originalBounds.minCol,
    originalBounds.maxRow - originalBounds.minRow + 1,
    originalBounds.maxCol - originalBounds.minCol + 1
  );

  // Write at new position
  const newBounds = offsetBounds(originalBounds, dRow, dCol);
  for (let r = 0; r < block.length; r++) {
    for (let c = 0; c < block[r].length; c++) {
      grid.setChar(newBounds.minRow + r, newBounds.minCol + c, block[r][c]);
    }
  }

  return newBounds;
}

/**
 * Compute new bounds after resizing from a corner.
 */
export function computeResizedBounds(
  originalBounds: ObjectBounds,
  corner: ResizeCorner,
  dRow: number,
  dCol: number
): ObjectBounds {
  const b = { ...originalBounds };

  switch (corner) {
    case 'top-left':
      b.minRow += dRow;
      b.minCol += dCol;
      break;
    case 'top-right':
      b.minRow += dRow;
      b.maxCol += dCol;
      break;
    case 'bottom-left':
      b.maxRow += dRow;
      b.minCol += dCol;
      break;
    case 'bottom-right':
      b.maxRow += dRow;
      b.maxCol += dCol;
      break;
  }

  // Enforce minimum size: at least 1 row tall and 2 cols wide
  if (b.maxRow - b.minRow < 1) {
    if (corner === 'top-left' || corner === 'top-right') {
      b.minRow = b.maxRow - 1;
    } else {
      b.maxRow = b.minRow + 1;
    }
  }
  if (b.maxCol - b.minCol < 2) {
    if (corner === 'top-left' || corner === 'bottom-left') {
      b.minCol = b.maxCol - 2;
    } else {
      b.maxCol = b.minCol + 2;
    }
  }

  return b;
}

/**
 * Build a box border with Unicode corners and edges.
 */
function buildBoxChars(bounds: ObjectBounds): { row: number; col: number; char: string }[] {
  const cells: { row: number; col: number; char: string }[] = [];

  for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
    let topCh: string;
    let botCh: string;
    if (c === bounds.minCol) { topCh = BOX.TL; botCh = BOX.BL; }
    else if (c === bounds.maxCol) { topCh = BOX.TR; botCh = BOX.BR; }
    else { topCh = BOX.H; botCh = BOX.H; }
    cells.push({ row: bounds.minRow, col: c, char: topCh });
    cells.push({ row: bounds.maxRow, col: c, char: botCh });
  }

  for (let r = bounds.minRow + 1; r < bounds.maxRow; r++) {
    cells.push({ row: r, col: bounds.minCol, char: BOX.V });
    cells.push({ row: r, col: bounds.maxCol, char: BOX.V });
  }

  return cells;
}

/**
 * Build preview cells for resizing a box.
 */
export function buildResizePreview(
  grid: CharGrid,
  originalBounds: ObjectBounds,
  newBounds: ObjectBounds
): PreviewCell[] {
  // Extract interior content from original box
  const interiorHeight = originalBounds.maxRow - originalBounds.minRow - 1;
  const interiorWidth = originalBounds.maxCol - originalBounds.minCol - 1;
  const interior: string[][] = [];
  for (let r = 0; r < interiorHeight; r++) {
    const row: string[] = [];
    for (let c = 0; c < interiorWidth; c++) {
      row.push(grid.getChar(originalBounds.minRow + 1 + r, originalBounds.minCol + 1 + c));
    }
    interior.push(row);
  }

  const cells: PreviewCell[] = [];

  // Draw new box border
  const borderChars = buildBoxChars(newBounds);
  for (const bc of borderChars) {
    if (bc.row >= 0 && bc.row < grid.rows && bc.col >= 0 && bc.col < grid.cols) {
      cells.push({ row: bc.row, col: bc.col, char: bc.char });
    }
  }

  // Paste interior (clipped to new interior size)
  const newInteriorHeight = newBounds.maxRow - newBounds.minRow - 1;
  const newInteriorWidth = newBounds.maxCol - newBounds.minCol - 1;
  for (let r = 0; r < newInteriorHeight; r++) {
    for (let c = 0; c < newInteriorWidth; c++) {
      const row = newBounds.minRow + 1 + r;
      const col = newBounds.minCol + 1 + c;
      if (row >= 0 && row < grid.rows && col >= 0 && col < grid.cols) {
        const ch = (r < interior.length && c < (interior[r]?.length ?? 0))
          ? interior[r][c]
          : ' ';
        cells.push({ row, col, char: ch });
      }
    }
  }

  return cells;
}

/**
 * Apply a resize operation to the grid (box only).
 * Returns the new bounds.
 */
export function applyResize(
  grid: CharGrid,
  originalBounds: ObjectBounds,
  newBounds: ObjectBounds
): ObjectBounds {
  // Extract interior content
  const interiorHeight = originalBounds.maxRow - originalBounds.minRow - 1;
  const interiorWidth = originalBounds.maxCol - originalBounds.minCol - 1;
  const interior: string[][] = [];
  for (let r = 0; r < interiorHeight; r++) {
    const row: string[] = [];
    for (let c = 0; c < interiorWidth; c++) {
      row.push(grid.getChar(originalBounds.minRow + 1 + r, originalBounds.minCol + 1 + c));
    }
    interior.push(row);
  }

  // Clear old box region
  grid.clearRegion(
    originalBounds.minRow,
    originalBounds.minCol,
    originalBounds.maxRow - originalBounds.minRow + 1,
    originalBounds.maxCol - originalBounds.minCol + 1
  );

  // Draw new box border
  const borderChars = buildBoxChars(newBounds);
  for (const bc of borderChars) {
    grid.setChar(bc.row, bc.col, bc.char);
  }

  // Paste interior (clipped to new interior size)
  const newInteriorHeight = newBounds.maxRow - newBounds.minRow - 1;
  const newInteriorWidth = newBounds.maxCol - newBounds.minCol - 1;
  for (let r = 0; r < newInteriorHeight; r++) {
    for (let c = 0; c < newInteriorWidth; c++) {
      const ch = (r < interior.length && c < (interior[r]?.length ?? 0))
        ? interior[r][c]
        : ' ';
      grid.setChar(newBounds.minRow + 1 + r, newBounds.minCol + 1 + c, ch);
    }
  }

  return newBounds;
}

/**
 * Clear all characters within bounds (set to space).
 */
export function clearBounds(grid: CharGrid, bounds: ObjectBounds): void {
  grid.clearRegion(
    bounds.minRow,
    bounds.minCol,
    bounds.maxRow - bounds.minRow + 1,
    bounds.maxCol - bounds.minCol + 1
  );
}
