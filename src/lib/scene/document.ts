import { nanoid } from 'nanoid';
import {
  NodeId,
  SceneNode,
  GroupNode,
  Bounds,
  SceneDocument,
} from './types';

export { type SceneDocument } from './types';

// Re-export for convenience — the interface lives in types.ts but we augment it here:
// (SceneDocument is declared in types.ts to avoid circular deps)

export function createDocument(rows: number, cols: number): SceneDocument {
  return {
    nodes: new Map(),
    rootOrder: [],
    gridRows: rows,
    gridCols: cols,
  };
}

export function generateId(): NodeId {
  return nanoid(10);
}

export function addNode(doc: SceneDocument, node: SceneNode): SceneDocument {
  const next = cloneDocShallow(doc);
  next.nodes.set(node.id, node);
  if (node.parentId) {
    const parent = next.nodes.get(node.parentId);
    if (parent && parent.type === 'group') {
      const g = { ...parent, childIds: [...parent.childIds, node.id] } as GroupNode;
      next.nodes.set(g.id, g);
      refreshGroupChain(next, node.parentId);
    }
  } else {
    next.rootOrder = [...next.rootOrder, node.id];
  }
  return next;
}

export function removeNode(doc: SceneDocument, id: NodeId): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);

  // Recursive removal for groups
  if (node.type === 'group') {
    for (const childId of (node as GroupNode).childIds) {
      removeNodeInner(next, childId);
    }
  }

  removeNodeInner(next, id);
  return next;
}

function removeNodeInner(doc: SceneDocument, id: NodeId): void {
  const node = doc.nodes.get(id);
  if (!node) return;

  // Recurse into group children
  if (node.type === 'group') {
    for (const childId of (node as GroupNode).childIds) {
      removeNodeInner(doc, childId);
    }
  }

  // Remove from parent's childIds
  if (node.parentId) {
    const parent = doc.nodes.get(node.parentId);
    if (parent && parent.type === 'group') {
      const g = { ...parent, childIds: (parent as GroupNode).childIds.filter(c => c !== id) } as GroupNode;
      doc.nodes.set(g.id, g);
      refreshGroupChain(doc, node.parentId);
    }
  } else {
    doc.rootOrder = doc.rootOrder.filter(rid => rid !== id);
  }

  doc.nodes.delete(id);
}

function refreshGroupChain(doc: SceneDocument, parentId: NodeId | null): void {
  let currentId = parentId;
  while (currentId) {
    const node = doc.nodes.get(currentId);
    if (!node || node.type !== 'group') break;
    const group = node as GroupNode;
    const bounds = computeGroupBounds(doc, group);
    doc.nodes.set(group.id, { ...group, bounds } as GroupNode);
    currentId = group.parentId;
  }
}

function computeGroupBounds(doc: SceneDocument, group: GroupNode): Bounds {
  if (group.childIds.length === 0) {
    return { ...group.bounds };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const childId of group.childIds) {
    const child = doc.nodes.get(childId);
    if (!child) continue;
    minX = Math.min(minX, child.bounds.x);
    minY = Math.min(minY, child.bounds.y);
    maxX = Math.max(maxX, child.bounds.x + child.bounds.width);
    maxY = Math.max(maxY, child.bounds.y + child.bounds.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { ...group.bounds };
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function removeNodes(doc: SceneDocument, ids: NodeId[]): SceneDocument {
  let next = doc;
  for (const id of ids) {
    next = removeNode(next, id);
  }
  return next;
}

export function updateNode(doc: SceneDocument, id: NodeId, patch: Partial<SceneNode>): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);
  const updated = { ...node, ...patch, id, type: node.type } as SceneNode;
  fitBoundsToContent(updated);
  next.nodes.set(id, updated);
  refreshGroupChain(next, updated.parentId);
  return next;
}

/** Recalculate bounds when content-defining props change. */
function fitBoundsToContent(node: SceneNode): void {
  const b = node.bounds;
  switch (node.type) {
    case 'table': {
      // height = 1 (top border) + 1 (header) + 1 (separator) + rowCount + 1 (bottom border)
      const minH = node.rowCount + 3;
      // width = sum of columnWidths + 1 (for borders)
      const minW = node.columns.length * (node.columnWidths[0] ?? 10) + 1;
      node.bounds = { ...b, height: Math.max(minH, 4), width: Math.max(minW, b.width) };
      // Sync columnWidths array length to match columns
      if (node.columnWidths.length !== node.columns.length) {
        const cw = node.columnWidths[0] ?? 10;
        node.columnWidths = node.columns.map((_, i) => node.columnWidths[i] ?? cw);
      }
      break;
    }
    case 'list': {
      const minH = node.items.length;
      const minW = Math.max(...node.items.map(s => s.length + 2), 3);
      node.bounds = { ...b, height: Math.max(minH, 1), width: Math.max(minW, b.width) };
      break;
    }
    case 'breadcrumb': {
      const str = node.items.join(' > ');
      node.bounds = { ...b, width: Math.max(str.length, 1), height: 1 };
      break;
    }
    case 'tabs': {
      const line = node.tabs.map((t, i) => i === node.activeIndex ? `[ ${t} ]` : ` ${t}`).join('  ');
      node.bounds = { ...b, width: Math.max(line.length, b.width) };
      break;
    }
    case 'nav': {
      const content = [node.logo, ...node.links].join('   ');
      const action = `[ ${node.action} ]`;
      const minW = content.length + 4 + action.length;
      node.bounds = { ...b, width: Math.max(minW, b.width), height: Math.max(3, b.height) };
      break;
    }
    case 'text': {
      const lines = node.content.split('\n');
      const maxLineLen = Math.max(...lines.map(l => l.length), 1);
      node.bounds = { ...b, width: maxLineLen, height: lines.length };
      break;
    }
  }
}

export function setNodeVisibility(doc: SceneDocument, id: NodeId, visible: boolean): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);
  setNodeVisibilityInner(next, id, visible);
  return next;
}

function setNodeVisibilityInner(doc: SceneDocument, id: NodeId, visible: boolean): void {
  const node = doc.nodes.get(id);
  if (!node) return;
  doc.nodes.set(id, { ...node, visible } as SceneNode);
  if (node.type === 'group') {
    for (const childId of (node as GroupNode).childIds) {
      setNodeVisibilityInner(doc, childId, visible);
    }
  }
}

export function moveNode(doc: SceneDocument, id: NodeId, dRow: number, dCol: number): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);

  // Clamp delta so the top-level node stays on canvas
  const clampedDCol = Math.max(-node.bounds.x, Math.min(doc.gridCols - node.bounds.width - node.bounds.x, dCol));
  const clampedDRow = Math.max(-node.bounds.y, Math.min(doc.gridRows - node.bounds.height - node.bounds.y, dRow));

  shiftNodeBounds(next, id, clampedDRow, clampedDCol);
  refreshGroupChain(next, node.parentId);
  return next;
}

function shiftNodeBounds(doc: SceneDocument, id: NodeId, dRow: number, dCol: number): void {
  const node = doc.nodes.get(id);
  if (!node) return;
  if (node.type === 'line' || node.type === 'arrow') {
    const points = node.points.map((point) => ({
      row: point.row + dRow,
      col: point.col + dCol,
    }));
    const bounds = boundsFromPoints(points);
    doc.nodes.set(id, { ...node, points, bounds } as SceneNode);
  } else {
    const newBounds: Bounds = {
      x: node.bounds.x + dCol,
      y: node.bounds.y + dRow,
      width: node.bounds.width,
      height: node.bounds.height,
    };
    doc.nodes.set(id, { ...node, bounds: newBounds } as SceneNode);
  }

  // Recurse into group children (they move with the same clamped delta)
  if (node.type === 'group') {
    for (const childId of (node as GroupNode).childIds) {
      shiftNodeBounds(doc, childId, dRow, dCol);
    }
  }
}

export function moveNodes(doc: SceneDocument, ids: NodeId[], dRow: number, dCol: number): SceneDocument {
  const next = cloneDocShallow(doc);
  for (const id of ids) {
    const node = next.nodes.get(id);
    if (!node) continue;
    // Clamp delta so each top-level node stays on canvas
    const clampedDCol = Math.max(-node.bounds.x, Math.min(doc.gridCols - node.bounds.width - node.bounds.x, dCol));
    const clampedDRow = Math.max(-node.bounds.y, Math.min(doc.gridRows - node.bounds.height - node.bounds.y, dRow));
    shiftNodeBounds(next, id, clampedDRow, clampedDCol);
    refreshGroupChain(next, node.parentId);
  }
  return next;
}

export function resizeNode(doc: SceneDocument, id: NodeId, newBounds: Bounds): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);
  // Clamp to grid bounds and enforce minimum size
  const clamped: Bounds = {
    x: Math.max(0, newBounds.x),
    y: Math.max(0, newBounds.y),
    width: Math.max(1, newBounds.width),
    height: Math.max(1, newBounds.height),
  };
  if (clamped.x + clamped.width > doc.gridCols) {
    clamped.width = doc.gridCols - clamped.x;
  }
  if (clamped.y + clamped.height > doc.gridRows) {
    clamped.height = doc.gridRows - clamped.y;
  }
  // Re-enforce minimums after clamping
  if (clamped.width < 1) clamped.width = 1;
  if (clamped.height < 1) clamped.height = 1;

  if (node.type === 'group') {
    const sx = clamped.width / Math.max(1, node.bounds.width);
    const sy = clamped.height / Math.max(1, node.bounds.height);
    next.nodes.set(id, { ...node, bounds: clamped } as SceneNode);
    for (const childId of (node as GroupNode).childIds) {
      scaleNodeFromGroupResize(next, childId, node.bounds, clamped, sx, sy);
    }
    refreshGroupChain(next, node.parentId);
    return next;
  }

  if (node.type === 'line' || node.type === 'arrow') {
    const sx = clamped.width / Math.max(1, node.bounds.width);
    const sy = clamped.height / Math.max(1, node.bounds.height);
    const points = node.points.map((point) => ({
      row: scaleCoord(point.row, node.bounds.y, clamped.y, sy),
      col: scaleCoord(point.col, node.bounds.x, clamped.x, sx),
    }));
    const bounds = boundsFromPoints(points);
    next.nodes.set(id, { ...node, points, bounds } as SceneNode);
    refreshGroupChain(next, node.parentId);
    return next;
  }

  next.nodes.set(id, { ...node, bounds: clamped } as SceneNode);
  refreshGroupChain(next, node.parentId);
  return next;
}

function scaleNodeFromGroupResize(
  doc: SceneDocument,
  id: NodeId,
  oldGroupBounds: Bounds,
  newGroupBounds: Bounds,
  sx: number,
  sy: number
): void {
  const node = doc.nodes.get(id);
  if (!node) return;

  if (node.type === 'line' || node.type === 'arrow') {
    const points = node.points.map((point) => ({
      row: scaleCoord(point.row, oldGroupBounds.y, newGroupBounds.y, sy),
      col: scaleCoord(point.col, oldGroupBounds.x, newGroupBounds.x, sx),
    }));
    const b = boundsFromPoints(points);
    doc.nodes.set(id, { ...node, points, bounds: b } as SceneNode);
  } else if (node.type === 'stroke') {
    const absCells = node.cells.map((cell) => ({
      row: node.bounds.y + cell.row,
      col: node.bounds.x + cell.col,
      char: cell.char,
    }));
    const scaledAbs = absCells.map((cell) => ({
      row: scaleCoord(cell.row, oldGroupBounds.y, newGroupBounds.y, sy),
      col: scaleCoord(cell.col, oldGroupBounds.x, newGroupBounds.x, sx),
      char: cell.char,
    }));
    if (scaledAbs.length === 0) {
      const bounds: Bounds = {
        x: scaleCoord(node.bounds.x, oldGroupBounds.x, newGroupBounds.x, sx),
        y: scaleCoord(node.bounds.y, oldGroupBounds.y, newGroupBounds.y, sy),
        width: Math.max(1, Math.round(node.bounds.width * sx)),
        height: Math.max(1, Math.round(node.bounds.height * sy)),
      };
      doc.nodes.set(id, { ...node, bounds } as SceneNode);
      return;
    }
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    for (const cell of scaledAbs) {
      minRow = Math.min(minRow, cell.row);
      maxRow = Math.max(maxRow, cell.row);
      minCol = Math.min(minCol, cell.col);
      maxCol = Math.max(maxCol, cell.col);
    }
    const bounds: Bounds = {
      x: minCol,
      y: minRow,
      width: Math.max(1, maxCol - minCol + 1),
      height: Math.max(1, maxRow - minRow + 1),
    };
    const cells = scaledAbs.map((cell) => ({
      row: cell.row - bounds.y,
      col: cell.col - bounds.x,
      char: cell.char,
    }));
    doc.nodes.set(id, { ...node, bounds, cells } as SceneNode);
  } else {
    const bounds: Bounds = {
      x: scaleCoord(node.bounds.x, oldGroupBounds.x, newGroupBounds.x, sx),
      y: scaleCoord(node.bounds.y, oldGroupBounds.y, newGroupBounds.y, sy),
      width: Math.max(1, Math.round(node.bounds.width * sx)),
      height: Math.max(1, Math.round(node.bounds.height * sy)),
    };
    doc.nodes.set(id, { ...node, bounds } as SceneNode);
  }

  if (node.type === 'group') {
    for (const childId of (node as GroupNode).childIds) {
      scaleNodeFromGroupResize(doc, childId, oldGroupBounds, newGroupBounds, sx, sy);
    }
  }
}

function scaleCoord(value: number, oldOrigin: number, newOrigin: number, scale: number): number {
  return newOrigin + Math.round((value - oldOrigin) * scale);
}

function boundsFromPoints(points: { row: number; col: number }[]): Bounds {
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (const point of points) {
    minRow = Math.min(minRow, point.row);
    maxRow = Math.max(maxRow, point.row);
    minCol = Math.min(minCol, point.col);
    maxCol = Math.max(maxCol, point.col);
  }
  return {
    x: minCol,
    y: minRow,
    width: Math.max(1, maxCol - minCol + 1),
    height: Math.max(1, maxRow - minRow + 1),
  };
}

export function getZOrderedNodes(doc: SceneDocument): SceneNode[] {
  const result: SceneNode[] = [];
  function walk(ids: NodeId[]) {
    for (const id of ids) {
      const node = doc.nodes.get(id);
      if (!node) continue;
      result.push(node);
      if (node.type === 'group') {
        walk((node as GroupNode).childIds);
      }
    }
  }
  walk(doc.rootOrder);
  return result;
}

export function bringToFront(doc: SceneDocument, id: NodeId): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);

  if (node.parentId) {
    const parent = next.nodes.get(node.parentId);
    if (parent && parent.type === 'group') {
      const g = parent as GroupNode;
      const filtered = g.childIds.filter(c => c !== id);
      next.nodes.set(g.id, { ...g, childIds: [...filtered, id] } as GroupNode);
    }
  } else {
    next.rootOrder = [...next.rootOrder.filter(rid => rid !== id), id];
  }
  return next;
}

export function sendToBack(doc: SceneDocument, id: NodeId): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);

  if (node.parentId) {
    const parent = next.nodes.get(node.parentId);
    if (parent && parent.type === 'group') {
      const g = parent as GroupNode;
      const filtered = g.childIds.filter(c => c !== id);
      next.nodes.set(g.id, { ...g, childIds: [id, ...filtered] } as GroupNode);
    }
  } else {
    next.rootOrder = [id, ...next.rootOrder.filter(rid => rid !== id)];
  }
  return next;
}

export function groupNodes(doc: SceneDocument, ids: NodeId[], groupName: string = 'Group'): SceneDocument {
  if (ids.length < 2) return doc;
  const next = cloneDocShallow(doc);

  // Compute bounding box of all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const node = next.nodes.get(id);
    if (!node) continue;
    minX = Math.min(minX, node.bounds.x);
    minY = Math.min(minY, node.bounds.y);
    maxX = Math.max(maxX, node.bounds.x + node.bounds.width);
    maxY = Math.max(maxY, node.bounds.y + node.bounds.height);
  }

  const groupId = generateId();
  const group: GroupNode = {
    id: groupId,
    type: 'group',
    name: groupName,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    visible: true,
    locked: false,
    parentId: null,
    childIds: [...ids],
  };

  // Find insert position (where first child was in rootOrder)
  let insertIdx = next.rootOrder.length;
  for (let i = 0; i < next.rootOrder.length; i++) {
    if (ids.includes(next.rootOrder[i])) {
      insertIdx = i;
      break;
    }
  }

  // Remove children from rootOrder, reparent
  next.rootOrder = next.rootOrder.filter(rid => !ids.includes(rid));
  next.rootOrder.splice(insertIdx, 0, groupId);

  for (const id of ids) {
    const node = next.nodes.get(id);
    if (node) {
      next.nodes.set(id, { ...node, parentId: groupId } as SceneNode);
    }
  }

  next.nodes.set(groupId, group);
  return next;
}

export function ungroupNode(doc: SceneDocument, groupId: NodeId): SceneDocument {
  const group = doc.nodes.get(groupId);
  if (!group || group.type !== 'group') return doc;
  const next = cloneDocShallow(doc);
  const g = group as GroupNode;

  // Find group position in rootOrder
  const idx = next.rootOrder.indexOf(groupId);

  // Remove group from rootOrder, insert children at same position
  next.rootOrder = next.rootOrder.filter(rid => rid !== groupId);
  next.rootOrder.splice(idx >= 0 ? idx : next.rootOrder.length, 0, ...g.childIds);

  // Reparent children to root
  for (const childId of g.childIds) {
    const child = next.nodes.get(childId);
    if (child) {
      next.nodes.set(childId, { ...child, parentId: null } as SceneNode);
    }
  }

  next.nodes.delete(groupId);
  return next;
}

export function cloneDocument(doc: SceneDocument): SceneDocument {
  const nodes = new Map<NodeId, SceneNode>();
  for (const [id, node] of doc.nodes) {
    if (node.type === 'stroke') {
      nodes.set(id, { ...node, cells: [...node.cells], bounds: { ...node.bounds } });
    } else if (node.type === 'group') {
      nodes.set(id, { ...node, childIds: [...(node as GroupNode).childIds], bounds: { ...node.bounds } });
    } else if (node.type === 'line' || node.type === 'arrow') {
      nodes.set(id, { ...node, points: [...node.points], bounds: { ...node.bounds } } as SceneNode);
    } else if (node.type === 'table') {
      nodes.set(id, { ...node, columns: [...node.columns], columnWidths: [...node.columnWidths], bounds: { ...node.bounds } } as SceneNode);
    } else if (node.type === 'tabs') {
      nodes.set(id, { ...node, tabs: [...node.tabs], bounds: { ...node.bounds } } as SceneNode);
    } else if (node.type === 'nav') {
      nodes.set(id, { ...node, links: [...node.links], bounds: { ...node.bounds } } as SceneNode);
    } else if (node.type === 'list') {
      nodes.set(id, { ...node, items: [...node.items], bounds: { ...node.bounds } } as SceneNode);
    } else if (node.type === 'breadcrumb') {
      nodes.set(id, { ...node, items: [...node.items], bounds: { ...node.bounds } } as SceneNode);
    } else {
      nodes.set(id, { ...node, bounds: { ...node.bounds } } as SceneNode);
    }
  }
  return {
    nodes,
    rootOrder: [...doc.rootOrder],
    gridRows: doc.gridRows,
    gridCols: doc.gridCols,
  };
}

export function moveInOrder(doc: SceneDocument, id: NodeId, newIndex: number): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);

  if (node.parentId) {
    const parent = next.nodes.get(node.parentId);
    if (parent && parent.type === 'group') {
      const g = parent as GroupNode;
      const filtered = g.childIds.filter(c => c !== id);
      const clamped = Math.max(0, Math.min(newIndex, filtered.length));
      filtered.splice(clamped, 0, id);
      next.nodes.set(g.id, { ...g, childIds: filtered } as GroupNode);
    }
  } else {
    const filtered = next.rootOrder.filter(rid => rid !== id);
    const clamped = Math.max(0, Math.min(newIndex, filtered.length));
    filtered.splice(clamped, 0, id);
    next.rootOrder = filtered;
  }
  return next;
}

function isDescendant(doc: SceneDocument, nodeId: NodeId, potentialAncestorId: NodeId): boolean {
  let current = doc.nodes.get(nodeId);
  while (current) {
    if (current.parentId === potentialAncestorId) return true;
    current = current.parentId ? doc.nodes.get(current.parentId) : undefined;
  }
  return false;
}

export function reparentNode(doc: SceneDocument, id: NodeId, newParentId: NodeId | null, index: number): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  // Cycle detection: can't drop a node into its own descendant
  if (newParentId && (newParentId === id || isDescendant(doc, newParentId, id))) return doc;
  // No-op if already in the right place
  if (node.parentId === newParentId) {
    return moveInOrder(doc, id, index);
  }

  const next = cloneDocShallow(doc);
  const oldParentId = node.parentId;

  // Remove from old parent
  if (oldParentId) {
    const oldParent = next.nodes.get(oldParentId);
    if (oldParent && oldParent.type === 'group') {
      const g = oldParent as GroupNode;
      next.nodes.set(g.id, { ...g, childIds: g.childIds.filter(c => c !== id) } as GroupNode);
    }
  } else {
    next.rootOrder = next.rootOrder.filter(rid => rid !== id);
  }

  // Add to new parent
  if (newParentId) {
    const newParent = next.nodes.get(newParentId);
    if (newParent && newParent.type === 'group') {
      const g = newParent as GroupNode;
      const children = [...g.childIds];
      const clamped = Math.max(0, Math.min(index, children.length));
      children.splice(clamped, 0, id);
      next.nodes.set(g.id, { ...g, childIds: children } as GroupNode);
    }
  } else {
    const clamped = Math.max(0, Math.min(index, next.rootOrder.length));
    next.rootOrder.splice(clamped, 0, id);
  }

  // Update node's parentId
  next.nodes.set(id, { ...node, parentId: newParentId } as SceneNode);

  // Refresh group chains for both old and new parents
  if (oldParentId) refreshGroupChain(next, oldParentId);
  if (newParentId) refreshGroupChain(next, newParentId);

  return next;
}

export function reparentNodes(doc: SceneDocument, ids: NodeId[], newParentId: NodeId | null, index: number): SceneDocument {
  let next = doc;
  for (let i = 0; i < ids.length; i++) {
    next = reparentNode(next, ids[i], newParentId, index + i);
  }
  return next;
}

// Shallow clone: copies the Map reference (new Map from entries) and rootOrder array
function cloneDocShallow(doc: SceneDocument): SceneDocument {
  return {
    nodes: new Map(doc.nodes),
    rootOrder: [...doc.rootOrder],
    gridRows: doc.gridRows,
    gridCols: doc.gridCols,
  };
}
