import { CharGrid } from './grid-model';
import { isBoxCorner, isBoxHorizontal, isBoxVertical } from './box-chars';

export interface ObjectBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export type ObjectType = 'box' | 'widget';

export interface DetectedObject {
  bounds: ObjectBounds;
  type: ObjectType;
}

/**
 * Detect a box at the given position by scanning for corners and validating edges.
 */
function detectBox(grid: CharGrid, row: number, col: number): DetectedObject | null {
  // Find the left wall: scan left for vertical or corner
  let leftCol = col;
  while (leftCol >= 0) {
    const ch = grid.getChar(row, leftCol);
    if (isBoxVertical(ch) || isBoxCorner(ch)) break;
    if (ch !== ' ' && !isBoxHorizontal(ch) && leftCol !== col) {
      // Hit a non-box character, try from click position rightward
      break;
    }
    leftCol--;
  }
  if (leftCol < 0) return null;

  const leftChar = grid.getChar(row, leftCol);
  if (!isBoxVertical(leftChar) && !isBoxCorner(leftChar)) return null;

  // Find the right wall: scan right for vertical or corner
  let rightCol = col;
  while (rightCol < grid.cols) {
    const ch = grid.getChar(row, rightCol);
    if ((isBoxVertical(ch) || isBoxCorner(ch)) && rightCol !== leftCol) break;
    if (rightCol === leftCol) { rightCol++; continue; }
    if (ch !== ' ' && !isBoxHorizontal(ch)) break;
    rightCol++;
  }
  if (rightCol >= grid.cols) return null;

  const rightChar = grid.getChar(row, rightCol);
  if (!isBoxVertical(rightChar) && !isBoxCorner(rightChar)) return null;

  // Need at least 2 cols apart
  if (rightCol - leftCol < 2) return null;

  // Scan up from leftCol to find top corner
  let topRow = row;
  while (topRow >= 0) {
    const ch = grid.getChar(topRow, leftCol);
    if (isBoxCorner(ch)) break;
    if (!isBoxVertical(ch)) { topRow = -1; break; }
    topRow--;
  }
  if (topRow < 0) return null;

  // Verify top-right corner is also a corner
  if (!isBoxCorner(grid.getChar(topRow, rightCol))) return null;

  // Scan down from leftCol to find bottom corner
  let bottomRow = row;
  while (bottomRow < grid.rows) {
    const ch = grid.getChar(bottomRow, leftCol);
    if (isBoxCorner(ch) && bottomRow !== topRow) break;
    if (!isBoxVertical(ch) && !isBoxCorner(ch)) { bottomRow = grid.rows; break; }
    bottomRow++;
  }
  if (bottomRow >= grid.rows) return null;

  // Verify bottom-right corner is also a corner
  if (!isBoxCorner(grid.getChar(bottomRow, rightCol))) return null;

  // Need at least 1 row apart
  if (bottomRow - topRow < 1) return null;

  // Validate top edge: all horizontal between corners
  for (let c = leftCol + 1; c < rightCol; c++) {
    if (!isBoxHorizontal(grid.getChar(topRow, c))) return null;
  }

  // Validate bottom edge
  for (let c = leftCol + 1; c < rightCol; c++) {
    if (!isBoxHorizontal(grid.getChar(bottomRow, c))) return null;
  }

  // Validate left edge: all vertical between corners
  for (let r = topRow + 1; r < bottomRow; r++) {
    if (!isBoxVertical(grid.getChar(r, leftCol))) return null;
  }

  // Validate right edge
  for (let r = topRow + 1; r < bottomRow; r++) {
    if (!isBoxVertical(grid.getChar(r, rightCol))) return null;
  }

  return {
    bounds: { minRow: topRow, maxRow: bottomRow, minCol: leftCol, maxCol: rightCol },
    type: 'box',
  };
}

/**
 * Detect a single-line widget at the given position.
 * Supports: Button [ Label ], Checkbox [ ]/[x], Radio ( )/(*), Input [___], Dropdown [v ...]
 */
function detectWidget(grid: CharGrid, row: number, col: number): DetectedObject | null {
  // Scan left for '[' or '('
  let openCol = col;
  while (openCol >= 0) {
    const ch = grid.getChar(row, openCol);
    if (ch === '[' || ch === '(') break;
    openCol--;
  }
  if (openCol < 0) return null;

  const openChar = grid.getChar(row, openCol);

  // Radio: ( ) Label or (*) Label
  if (openChar === '(') {
    if (openCol + 2 < grid.cols && grid.getChar(row, openCol + 2) === ')') {
      const marker = grid.getChar(row, openCol + 1);
      if (marker === ' ' || marker === '*') {
        // Find the end of the label
        let endCol = openCol + 2;
        if (openCol + 3 < grid.cols && grid.getChar(row, openCol + 3) === ' ') {
          // Has label after "( ) "
          endCol = openCol + 3;
          let lastNonSpace = endCol;
          for (let c = endCol + 1; c < grid.cols; c++) {
            if (grid.getChar(row, c) !== ' ') lastNonSpace = c;
            else if (c - lastNonSpace > 1) break; // two consecutive spaces = end of label
          }
          endCol = lastNonSpace;
        }
        return {
          bounds: { minRow: row, maxRow: row, minCol: openCol, maxCol: endCol },
          type: 'widget',
        };
      }
    }
    return null;
  }

  // Bracket-based widgets: scan right for ']'
  let closeCol = openCol + 1;
  while (closeCol < grid.cols) {
    if (grid.getChar(row, closeCol) === ']') break;
    closeCol++;
  }
  if (closeCol >= grid.cols) return null;

  // Checkbox: [ ] or [x] possibly followed by label
  if (closeCol === openCol + 2) {
    const inner = grid.getChar(row, openCol + 1);
    if (inner === ' ' || inner === 'x') {
      let endCol = closeCol;
      if (closeCol + 1 < grid.cols && grid.getChar(row, closeCol + 1) === ' ') {
        endCol = closeCol + 1;
        let lastNonSpace = endCol;
        for (let c = endCol + 1; c < grid.cols; c++) {
          if (grid.getChar(row, c) !== ' ') lastNonSpace = c;
          else if (c - lastNonSpace > 1) break;
        }
        endCol = lastNonSpace;
      }
      return {
        bounds: { minRow: row, maxRow: row, minCol: openCol, maxCol: endCol },
        type: 'widget',
      };
    }
  }

  // Make sure click is within this widget's range
  if (col > closeCol) return null;

  // Input field: [____] (underscores)
  let allUnder = true;
  for (let c = openCol + 1; c < closeCol; c++) {
    if (grid.getChar(row, c) !== '_') { allUnder = false; break; }
  }
  if (allUnder && closeCol - openCol > 2) {
    return {
      bounds: { minRow: row, maxRow: row, minCol: openCol, maxCol: closeCol },
      type: 'widget',
    };
  }

  // Dropdown: [v Label ] — starts with 'v' after '['
  // Button: [ Label ] — general bracket widget
  if (closeCol - openCol >= 2) {
    return {
      bounds: { minRow: row, maxRow: row, minCol: openCol, maxCol: closeCol },
      type: 'widget',
    };
  }

  return null;
}

/**
 * Detect an ASCII object at the given grid position.
 * Priority: box first (multi-line), then widget (single-line).
 */
export function detectObjectAt(grid: CharGrid, row: number, col: number): DetectedObject | null {
  // Try box detection first
  const box = detectBox(grid, row, col);
  if (box) return box;

  // Then try widget detection
  const widget = detectWidget(grid, row, col);
  if (widget) return widget;

  return null;
}
