import { SceneDocument, NodeId, SceneNode, GroupNode, ResizeCorner, Bounds } from './types';
import { getZOrderedNodes } from './document';

function boundsContains(b: Bounds, row: number, col: number): boolean {
  return row >= b.y && row < b.y + b.height && col >= b.x && col < b.x + b.width;
}

function boundsIntersects(a: Bounds, minRow: number, maxRow: number, minCol: number, maxCol: number): boolean {
  return a.x < maxCol + 1 && a.x + a.width > minCol && a.y < maxRow + 1 && a.y + a.height > minRow;
}

/**
 * Hit-test a single point against the scene.
 * Returns the topmost (highest z-order) node whose bounds contain the point.
 * If scope is set, only tests children of that group.
 */
export function hitTestPoint(
  doc: SceneDocument,
  row: number,
  col: number,
  scope: NodeId | null = null
): NodeId | null {
  // Get all nodes in z-order (bottom→top), then reverse for top→bottom testing
  const allNodes = getZOrderedNodes(doc);

  // Filter to scope if provided
  let candidates: SceneNode[];
  if (scope) {
    const scopeNode = doc.nodes.get(scope);
    if (!scopeNode || scopeNode.type !== 'group') return null;
    const childSet = new Set((scopeNode as GroupNode).childIds);
    candidates = allNodes.filter(n => childSet.has(n.id));
  } else {
    // Only test root-level nodes and groups (not children nested inside groups, unless drilling in)
    candidates = allNodes.filter(n => n.parentId === null);
  }

  // Walk top→bottom (reverse of z-order)
  for (let i = candidates.length - 1; i >= 0; i--) {
    const node = candidates[i];
    if (!node.visible || node.locked) continue;

    if (node.type === 'stroke') {
      // For strokes, check bounds first, then individual cells
      if (boundsContains(node.bounds, row, col)) {
        const hasCell = node.cells.some(
          c => c.row + node.bounds.y === row && c.col + node.bounds.x === col && c.char !== ' '
        );
        if (hasCell) return node.id;
      }
      continue;
    }

    if (node.type === 'text') {
      // For text, check if there's actual content at the position
      if (boundsContains(node.bounds, row, col)) {
        const lines = node.content.split('\n');
        const relRow = row - node.bounds.y;
        const relCol = col - node.bounds.x;
        if (relRow < lines.length && relCol < lines[relRow].length && lines[relRow][relCol] !== ' ') {
          return node.id;
        }
        // Still hit the text node if within bounds (even on empty space in the text area)
        return node.id;
      }
      continue;
    }

    if (node.type === 'line' || node.type === 'arrow') {
      // For lines/arrows, check with 1-cell tolerance along segments
      if (boundsContains(
        { x: node.bounds.x - 1, y: node.bounds.y - 1, width: node.bounds.width + 2, height: node.bounds.height + 2 },
        row, col
      )) {
        // Check proximity to any segment
        const points = node.points;
        for (let j = 0; j < points.length - 1; j++) {
          const p1 = points[j];
          const p2 = points[j + 1];
          if (p1.row === p2.row) {
            // Horizontal segment
            const minC = Math.min(p1.col, p2.col);
            const maxC = Math.max(p1.col, p2.col);
            if (Math.abs(row - p1.row) <= 1 && col >= minC && col <= maxC) return node.id;
          } else if (p1.col === p2.col) {
            // Vertical segment
            const minR = Math.min(p1.row, p2.row);
            const maxR = Math.max(p1.row, p2.row);
            if (Math.abs(col - p1.col) <= 1 && row >= minR && row <= maxR) return node.id;
          }
        }
      }
      continue;
    }

    // Default: AABB bounds check
    if (boundsContains(node.bounds, row, col)) {
      return node.id;
    }
  }

  return null;
}

/**
 * Hit-test a rectangular region, returning all non-group nodes that intersect.
 */
export function hitTestRegion(
  doc: SceneDocument,
  minRow: number,
  maxRow: number,
  minCol: number,
  maxCol: number,
  scope: NodeId | null = null
): NodeId[] {
  const result: NodeId[] = [];
  const allNodes = getZOrderedNodes(doc);

  let candidates: SceneNode[];
  if (scope) {
    const scopeNode = doc.nodes.get(scope);
    if (!scopeNode || scopeNode.type !== 'group') return [];
    const childSet = new Set((scopeNode as GroupNode).childIds);
    candidates = allNodes.filter(n => childSet.has(n.id));
  } else {
    candidates = allNodes.filter(n => n.parentId === null);
  }

  for (const node of candidates) {
    if (!node.visible || node.locked) continue;
    if (node.type === 'group') continue;
    if (boundsIntersects(node.bounds, minRow, maxRow, minCol, maxCol)) {
      result.push(node.id);
    }
  }

  return result;
}

/**
 * Check if a position is on a corner handle of a node's bounds.
 * Returns the corner name or null.
 */
export function hitTestCornerHandle(
  doc: SceneDocument,
  nodeId: NodeId,
  row: number,
  col: number,
  tolerance: number = 1
): ResizeCorner | null {
  const node = doc.nodes.get(nodeId);
  if (!node) return null;
  const b = node.bounds;

  const top = b.y;
  const bottom = b.y + b.height - 1;
  const left = b.x;
  const right = b.x + b.width - 1;

  if (Math.abs(row - top) <= tolerance && Math.abs(col - left) <= tolerance) return 'top-left';
  if (Math.abs(row - top) <= tolerance && Math.abs(col - right) <= tolerance) return 'top-right';
  if (Math.abs(row - bottom) <= tolerance && Math.abs(col - left) <= tolerance) return 'bottom-left';
  if (Math.abs(row - bottom) <= tolerance && Math.abs(col - right) <= tolerance) return 'bottom-right';

  return null;
}

/**
 * Check if a point is inside a node's bounds.
 */
export function isInsideNodeBounds(doc: SceneDocument, nodeId: NodeId, row: number, col: number): boolean {
  const node = doc.nodes.get(nodeId);
  if (!node) return false;
  return boundsContains(node.bounds, row, col);
}
