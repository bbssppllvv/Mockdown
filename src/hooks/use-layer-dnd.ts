import { useRef, useState, useCallback } from 'react';
import { NodeId, SceneDocument, GroupNode } from '@/lib/scene/types';

interface LayerRow {
  node: { id: NodeId; type: string; parentId: NodeId | null };
  parentId: string | null;
  indexInParent: number;
  depth: number;
  isGroup: boolean;
}

export type DropTarget =
  | { kind: 'between'; parentId: NodeId | null; index: number }
  | { kind: 'into-group'; groupId: NodeId };

const DEAD_ZONE = 4;

function isDescendantOf(doc: SceneDocument, nodeId: NodeId, ancestorId: NodeId): boolean {
  let current = doc.nodes.get(nodeId);
  while (current) {
    if (current.parentId === ancestorId) return true;
    current = current.parentId ? doc.nodes.get(current.parentId) : undefined;
  }
  return false;
}

export function useLayerDnd(
  layerRows: LayerRow[],
  selectedIds: NodeId[],
  doc: SceneDocument,
) {
  const rowRefs = useRef<Map<NodeId, HTMLElement>>(new Map());
  const [dragIds, setDragIds] = useState<NodeId[] | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; nodeId: NodeId } | null>(null);
  const activatedRef = useRef(false);

  const registerRowRef = useCallback((nodeId: NodeId, el: HTMLElement | null) => {
    if (el) {
      rowRefs.current.set(nodeId, el);
    } else {
      rowRefs.current.delete(nodeId);
    }
  }, []);

  const onPointerDown = useCallback((nodeId: NodeId, e: React.PointerEvent) => {
    // Only left button
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, nodeId };
    activatedRef.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;

    // Dead zone check
    if (!activatedRef.current) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return;
      activatedRef.current = true;

      // Determine what to drag
      const ids = selectedIds.includes(start.nodeId) ? [...selectedIds] : [start.nodeId];
      setDragIds(ids);
      setIsDragging(true);
    }

    if (!isDragging && !activatedRef.current) return;

    // Compute drop target from cursor position
    const cursorY = e.clientY;
    let bestTarget: DropTarget | null = null;

    for (let i = 0; i < layerRows.length; i++) {
      const row = layerRows[i];
      const el = rowRefs.current.get(row.node.id);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      if (cursorY < rect.top || cursorY > rect.bottom) continue;

      const relY = cursorY - rect.top;
      const height = rect.height;
      const fraction = relY / height;

      // Check if dropping here would create a cycle
      const currentDragIds = dragIds ?? (selectedIds.includes(start.nodeId) ? selectedIds : [start.nodeId]);
      const wouldCycle = currentDragIds.some(
        dragId => dragId === row.node.id || isDescendantOf(doc, row.node.id, dragId)
      );
      if (wouldCycle) break;

      if (fraction < 0.25) {
        // Top 25%: insert before
        bestTarget = { kind: 'between', parentId: row.parentId, index: row.indexInParent + 1 };
      } else if (fraction > 0.75) {
        // Bottom 25%: insert after
        if (row.isGroup && row.node.type === 'group') {
          // After a group → insert at beginning of group
          bestTarget = { kind: 'between', parentId: row.node.id, index: (doc.nodes.get(row.node.id) as GroupNode)?.childIds?.length ?? 0 };
        } else {
          bestTarget = { kind: 'between', parentId: row.parentId, index: row.indexInParent };
        }
      } else {
        // Middle 50%
        if (row.isGroup) {
          bestTarget = { kind: 'into-group', groupId: row.node.id };
        } else {
          // Snap to nearest edge
          bestTarget = fraction < 0.5
            ? { kind: 'between', parentId: row.parentId, index: row.indexInParent + 1 }
            : { kind: 'between', parentId: row.parentId, index: row.indexInParent };
        }
      }
      break;
    }

    setDropTarget(bestTarget);
  }, [layerRows, selectedIds, doc, isDragging, dragIds]);

  const onPointerUp = useCallback(() => {
    const result = isDragging && dragIds && dropTarget ? { dragIds, dropTarget } : null;
    dragStartRef.current = null;
    activatedRef.current = false;
    setDragIds(null);
    setDropTarget(null);
    setIsDragging(false);
    return result;
  }, [isDragging, dragIds, dropTarget]);

  return {
    registerRowRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    dragIds,
    dropTarget,
    isDragging,
  };
}
