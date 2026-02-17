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
    }
  } else {
    doc.rootOrder = doc.rootOrder.filter(rid => rid !== id);
  }

  doc.nodes.delete(id);
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
  next.nodes.set(id, { ...node, ...patch, id, type: node.type } as SceneNode);
  return next;
}

export function moveNode(doc: SceneDocument, id: NodeId, dRow: number, dCol: number): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);

  shiftNodeBounds(next, id, dRow, dCol);
  return next;
}

function shiftNodeBounds(doc: SceneDocument, id: NodeId, dRow: number, dCol: number): void {
  const node = doc.nodes.get(id);
  if (!node) return;
  const newBounds: Bounds = {
    x: node.bounds.x + dCol,
    y: node.bounds.y + dRow,
    width: node.bounds.width,
    height: node.bounds.height,
  };
  doc.nodes.set(id, { ...node, bounds: newBounds } as SceneNode);

  // Recurse into group children
  if (node.type === 'group') {
    for (const childId of (node as GroupNode).childIds) {
      shiftNodeBounds(doc, childId, dRow, dCol);
    }
  }
}

export function moveNodes(doc: SceneDocument, ids: NodeId[], dRow: number, dCol: number): SceneDocument {
  const next = cloneDocShallow(doc);
  for (const id of ids) {
    shiftNodeBounds(next, id, dRow, dCol);
  }
  return next;
}

export function resizeNode(doc: SceneDocument, id: NodeId, newBounds: Bounds): SceneDocument {
  const node = doc.nodes.get(id);
  if (!node) return doc;
  const next = cloneDocShallow(doc);
  next.nodes.set(id, { ...node, bounds: newBounds } as SceneNode);
  return next;
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

export function groupNodes(doc: SceneDocument, ids: NodeId[]): SceneDocument {
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
    name: 'Group',
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
    } else if (node.type === 'list' || node.type === 'breadcrumb') {
      nodes.set(id, { ...node, items: [...(node as any).items], bounds: { ...node.bounds } } as SceneNode);
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

// Shallow clone: copies the Map reference (new Map from entries) and rootOrder array
function cloneDocShallow(doc: SceneDocument): SceneDocument {
  return {
    nodes: new Map(doc.nodes),
    rootOrder: [...doc.rootOrder],
    gridRows: doc.gridRows,
    gridCols: doc.gridCols,
  };
}
