import { useSceneStore } from './use-scene-store';
import { getTool } from '@/components/tools/registry';
import { hitTestPoint, hitTestRegion, hitTestCornerHandle, isInsideNodeBounds } from '@/lib/scene/hit-test';
import { SparseCell, Bounds, GroupNode, SceneNode } from '@/lib/scene/types';
import { detectTextRegion, getPrimaryTextKey, getNodeText } from '@/lib/scene/text-editing';

// Module-level tracking for continuous drawing tools
let lastContinuousPos: { row: number; col: number } | null = null;
let continuousAccumulator: SparseCell[] = [];

// 1.4: Track last hover cell to avoid redundant setHover calls
let lastHoverRow = -1;
let lastHoverCol = -1;

export function pixelToGrid(
  x: number, y: number, cellWidth: number, cellHeight: number, maxRows: number, maxCols: number
): { row: number; col: number } {
  const col = Math.max(0, Math.min(Math.floor(x / cellWidth), maxCols - 1));
  const row = Math.max(0, Math.min(Math.floor(y / cellHeight), maxRows - 1));
  return { row, col };
}

function getPosFromClient(
  currentTarget: HTMLDivElement,
  clientX: number,
  clientY: number,
  cellWidth: number,
  cellHeight: number,
  scale: number
) {
  const rect = currentTarget.getBoundingClientRect();
  const s = useSceneStore.getState();
  return pixelToGrid(
    (clientX - rect.left) / scale, (clientY - rect.top) / scale,
    cellWidth, cellHeight, s.document.gridRows, s.document.gridCols
  );
}

// 3.3: getPos accounts for CSS scale transform
function getPos(e: React.PointerEvent<HTMLDivElement>, cellWidth: number, cellHeight: number, scale: number) {
  return getPosFromClient(e.currentTarget, e.clientX, e.clientY, cellWidth, cellHeight, scale);
}

export function useGridMouse(cellWidth: number, cellHeight: number, scale: number = 1) {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = useSceneStore.getState();

    // If generate prompt is open, clicking on grid dismisses it
    if (s.generateSelection) {
      s.clearGenerate();
      return;
    }

    const pos = getPos(e, cellWidth, cellHeight, scale);

    if (s.textInputActive) {
      s.stopEditing();
    }

    s.setCursor(pos.row, pos.col);

    // ── Select tool (Figma-style) ───────────────────────────────────
    if (s.activeTool === 'select') {
      const shiftHeld = e.shiftKey;

      // 1. Check corner resize handles on single-selected node
      if (s.selectedIds.length === 1) {
        const nodeId = s.selectedIds[0];
        const node = s.document.nodes.get(nodeId);
        const corner = hitTestCornerHandle(s.document, nodeId, pos.row, pos.col);
        if (corner && node) {
          s.pushUndo();
          s.setSelectInteraction('resizing');
          s.setSelectDragStart(pos);
          s.setResizeCorner(corner);
          s.setOriginalBoundsMap(new Map([[nodeId, { ...node.bounds }]]));
          return;
        }
      }

      // 2. Check if clicking inside an already-selected node → start move
      const clickedSelectedId = s.selectedIds.find(id =>
        isInsideNodeBounds(s.document, id, pos.row, pos.col)
      );
      if (clickedSelectedId) {
        s.pushUndo();
        s.setSelectInteraction('moving');
        s.setSelectDragStart(pos);
        const boundsMap = new Map<string, Bounds>();
        for (const id of s.selectedIds) {
          const n = s.document.nodes.get(id);
          if (n) boundsMap.set(id, { ...n.bounds });
        }
        s.setOriginalBoundsMap(boundsMap);
        return;
      }

      // 3. Hit-test for unselected node under cursor
      const hitId = hitTestPoint(s.document, pos.row, pos.col, s.drillScope);

      if (hitId) {
        // Shift+click → toggle in/out of selection
        if (shiftHeld) {
          const alreadySelected = s.selectedIds.includes(hitId);
          const newIds = alreadySelected
            ? s.selectedIds.filter(id => id !== hitId)
            : [...s.selectedIds, hitId];
          s.setSelection(newIds);
          // Prepare for potential move of the new selection
          s.setSelectInteraction('moving');
          s.setSelectDragStart(pos);
          const boundsMap = new Map<string, Bounds>();
          for (const id of newIds) {
            const n = s.document.nodes.get(id);
            if (n) boundsMap.set(id, { ...n.bounds });
          }
          s.setOriginalBoundsMap(boundsMap);
        } else {
          // Click on unselected node → select it, ready for immediate drag-move
          s.setSelection([hitId]);
          s.pushUndo();
          s.setSelectInteraction('moving');
          s.setSelectDragStart(pos);
          const node = s.document.nodes.get(hitId);
          if (node) {
            s.setOriginalBoundsMap(new Map([[hitId, { ...node.bounds }]]));
          }
        }
        return;
      }

      // 4. Empty space → deselect (unless shift) and start marquee
      if (!shiftHeld) {
        s.clearSelection();
      }
      s.setSelectInteraction('selecting');
      s.setSelectDragStart(pos);
      return;
    }

    // ── Drawing tools ────────────────────────────────────────────────
    const tool = getTool(s.activeTool);

    // Continuous drawing tools
    if (tool.continuous) {
      s.setIsDrawing(true);
      s.setDrawStart(pos);
      lastContinuousPos = pos;
      continuousAccumulator = [];

      if (tool.onContinuousDrag) {
        tool.onContinuousDrag(pos, pos, s.renderedGrid, continuousAccumulator);
        // Show full accumulator as preview so strokes stay visible during drag
        s.setPreview([...continuousAccumulator]);
      } else if (tool.onDragStart) {
        const cells = tool.onDragStart(pos, s.renderedGrid);
        if (cells) s.setPreview(cells);
      }
      return;
    }

    // All widget tools: start drag tracking (click vs drag determined on pointerUp)
    if (tool.onDragEnd || tool.onClick) {
      s.setIsDrawing(true);
      s.setDrawStart(pos);
      if (tool.onDragStart) {
        s.setPreview(tool.onDragStart(pos, s.renderedGrid));
      }
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = useSceneStore.getState();
    const pos = getPos(e, cellWidth, cellHeight, scale);

    // 1.4: Only update hover when grid cell actually changes
    if (pos.row !== lastHoverRow || pos.col !== lastHoverCol) {
      lastHoverRow = pos.row;
      lastHoverCol = pos.col;
      s.setHover(pos.row, pos.col);
    }

    // ── Select tool ──────────────────────────────────────────────────
    if (s.activeTool === 'select') {
      if (s.selectInteraction === 'moving' && s.selectDragStart && s.originalBoundsMap) {
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        // Build move preview from original bounds
        const preview: { row: number; col: number; char: string }[] = [];
        const addOutline = (nb: Bounds) => {
          for (let c = nb.x; c < nb.x + nb.width; c++) {
            preview.push({ row: nb.y, col: c, char: ' ' });
            preview.push({ row: nb.y + nb.height - 1, col: c, char: ' ' });
          }
          for (let r = nb.y + 1; r < nb.y + nb.height - 1; r++) {
            preview.push({ row: r, col: nb.x, char: ' ' });
            preview.push({ row: r, col: nb.x + nb.width - 1, char: ' ' });
          }
        };
        for (const [id, origBounds] of s.originalBoundsMap) {
          const nb = {
            x: origBounds.x + dCol,
            y: origBounds.y + dRow,
            width: origBounds.width,
            height: origBounds.height,
          };
          addOutline(nb);
          // Also show outlines for group children
          const node = s.document.nodes.get(id);
          if (node && node.type === 'group') {
            for (const childId of (node as GroupNode).childIds) {
              const child = s.document.nodes.get(childId);
              if (child) {
                addOutline({
                  x: child.bounds.x + dCol,
                  y: child.bounds.y + dRow,
                  width: child.bounds.width,
                  height: child.bounds.height,
                });
              }
            }
          }
        }
        s.setPreview(preview.length > 0 ? preview : null);
        return;
      }

      if (s.selectInteraction === 'resizing' && s.selectDragStart && s.originalBoundsMap && s.resizeCorner && s.selectedIds.length === 1) {
        const nodeId = s.selectedIds[0];
        const origBounds = s.originalBoundsMap.get(nodeId);
        if (!origBounds) return;
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        const newBounds = computeResizedBounds(origBounds, s.resizeCorner, dRow, dCol);
        // Show resize preview as empty outline
        const preview: { row: number; col: number; char: string }[] = [];
        for (let c = newBounds.x; c < newBounds.x + newBounds.width; c++) {
          preview.push({ row: newBounds.y, col: c, char: ' ' });
          preview.push({ row: newBounds.y + newBounds.height - 1, col: c, char: ' ' });
        }
        for (let r = newBounds.y + 1; r < newBounds.y + newBounds.height - 1; r++) {
          preview.push({ row: r, col: newBounds.x, char: ' ' });
          preview.push({ row: r, col: newBounds.x + newBounds.width - 1, char: ' ' });
        }
        s.setPreview(preview.length > 0 ? preview : null);
        return;
      }

      if (s.selectInteraction === 'selecting' && s.selectDragStart) {
        // Marquee — don't set selection during drag, wait for pointerup
        return;
      }

      if (s.preview) s.setPreview(null);
      return;
    }

    // ── Drawing tools ────────────────────────────────────────────────
    const tool = getTool(s.activeTool);

    // Continuous tools
    if (tool.continuous) {
      if (s.isDrawing && lastContinuousPos) {
        if (tool.onContinuousDrag) {
          tool.onContinuousDrag(lastContinuousPos, pos, s.renderedGrid, continuousAccumulator);
          // Show full accumulator so entire stroke stays visible during drag
          s.setPreview([...continuousAccumulator]);
        } else if (tool.onDrag) {
          const cells = tool.onDrag(lastContinuousPos, pos, s.renderedGrid);
          if (cells) s.setPreview(cells);
        }
        lastContinuousPos = pos;
      } else if (!s.isDrawing && tool.onDragStart) {
        s.setPreview(tool.onDragStart(pos, s.renderedGrid));
      }
      return;
    }

    if (s.isDrawing && s.drawStart && tool.onDrag) {
      s.setPreview(tool.onDrag(s.drawStart, pos, s.renderedGrid));
    } else if (!s.isDrawing && tool.onDrag && tool.onClick) {
      // Ghost preview: show widget at default size under cursor (only for click-placeable tools)
      // Drag-only tools (line, arrow) don't show ghost preview at rest
      s.setPreview(tool.onDrag(pos, pos, s.renderedGrid));
    } else if (!s.isDrawing && s.preview) {
      s.setPreview(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = useSceneStore.getState();

    // ── Select tool: finalize ────────────────────────────────────────
    if (s.activeTool === 'select') {
      if (s.selectInteraction === 'selecting' && s.selectDragStart) {
        const pos = getPos(e, cellWidth, cellHeight, scale);
        const dRow = Math.abs(pos.row - s.selectDragStart.row);
        const dCol = Math.abs(pos.col - s.selectDragStart.col);

        if (dRow + dCol > 0) {
          // Dragged: marquee select — find all nodes intersecting the rectangle
          const minR = Math.min(s.selectDragStart.row, pos.row);
          const maxR = Math.max(s.selectDragStart.row, pos.row);
          const minC = Math.min(s.selectDragStart.col, pos.col);
          const maxC = Math.max(s.selectDragStart.col, pos.col);
          const ids = hitTestRegion(s.document, minR, maxR, minC, maxC, s.drillScope);
          s.setSelection(ids);
        } else {
          // Click: point hit-test
          const hitId = hitTestPoint(s.document, pos.row, pos.col, s.drillScope);
          if (hitId) {
            s.setSelection([hitId]);
          } else {
            s.clearSelection();
            // If in drill scope, clicking empty exits drill
            if (s.drillScope) {
              s.setDrillScope(null);
            }
          }
        }

        s.setSelectInteraction('idle');
        s.setSelectDragStart(null);
        s.setPreview(null);
        return;
      }

      // Finalize move
      if (s.selectInteraction === 'moving' && s.selectDragStart && s.originalBoundsMap) {
        const pos = getPos(e, cellWidth, cellHeight, scale);
        const dRow = pos.row - s.selectDragStart.row;
        const dCol = pos.col - s.selectDragStart.col;
        if (dRow !== 0 || dCol !== 0) {
          s.moveNodes(s.selectedIds, dRow, dCol);
        } else {
          // No movement happened — this was just a click-to-select, pop the undo
          const { undoStack } = s;
          if (undoStack.length > 0) {
            const newStack = undoStack.slice(0, -1);
            useSceneStore.setState({ undoStack: newStack });
          }
        }
        s.setSelectInteraction('idle');
        s.setSelectDragStart(null);
        s.setOriginalBoundsMap(null);
        s.setPreview(null);
        return;
      }

      // Finalize resize
      if (s.selectInteraction === 'resizing' && s.selectDragStart && s.originalBoundsMap && s.resizeCorner && s.selectedIds.length === 1) {
        const pos = getPos(e, cellWidth, cellHeight, scale);
        const nodeId = s.selectedIds[0];
        const origBounds = s.originalBoundsMap.get(nodeId);
        if (origBounds) {
          const dRow = pos.row - s.selectDragStart.row;
          const dCol = pos.col - s.selectDragStart.col;
          if (dRow !== 0 || dCol !== 0) {
            const newBounds = computeResizedBounds(origBounds, s.resizeCorner, dRow, dCol);
            s.resizeNode(nodeId, newBounds);
          }
        }
        s.setSelectInteraction('idle');
        s.setSelectDragStart(null);
        s.setOriginalBoundsMap(null);
        s.setResizeCorner(null);
        s.setPreview(null);
        return;
      }
    }

    // ── Drawing tools: finalize ──────────────────────────────────────
    if (s.isDrawing && s.drawStart) {
      const pos = getPos(e, cellWidth, cellHeight, scale);
      const tool = getTool(s.activeTool);

      // Continuous tools: create StrokeNode from accumulator (or delete for eraser)
      if (tool.continuous) {
        if (s.activeTool === 'eraser') {
          // Eraser: hit-test accumulated positions and delete touched nodes
          const nodeIds = new Set<string>();
          for (const cell of continuousAccumulator) {
            const hitId = hitTestPoint(s.document, cell.row, cell.col);
            if (hitId) nodeIds.add(hitId);
          }
          if (nodeIds.size > 0) {
            s.pushUndo();
            s.removeNodes([...nodeIds]);
          }
          s.setIsDrawing(false);
          s.setDrawStart(null);
          s.setPreview(null);
          lastContinuousPos = null;
          continuousAccumulator = [];
          return;
        }

        if (continuousAccumulator.length > 0) {
          // Compute bounds from accumulated cells (absolute coords)
          let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
          for (const cell of continuousAccumulator) {
            if (cell.row < minR) minR = cell.row;
            if (cell.row > maxR) maxR = cell.row;
            if (cell.col < minC) minC = cell.col;
            if (cell.col > maxC) maxC = cell.col;
          }
          // Convert to relative coords
          const relativeCells: SparseCell[] = continuousAccumulator.map(c => ({
            row: c.row - minR,
            col: c.col - minC,
            char: c.char,
          }));
          s.pushUndo();
          s.addNode({
            type: 'stroke',
            name: 'Stroke',
            bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
            cells: relativeCells,
          });
          // Keep tool active — user can keep drawing (Figma-style)
        }
        s.setIsDrawing(false);
        s.setDrawStart(null);
        s.setPreview(null);
        lastContinuousPos = null;
        continuousAccumulator = [];
        return;
      }

      // Generate tool: store selection instead of applying chars
      if (s.activeTool === 'generate') {
        const minR = Math.min(s.drawStart.row, pos.row);
        const maxR = Math.max(s.drawStart.row, pos.row);
        const minC = Math.min(s.drawStart.col, pos.col);
        const maxC = Math.max(s.drawStart.col, pos.col);
        if (maxR - minR >= 1 && maxC - minC >= 2) {
          s.setGenerateSelection({ minRow: minR, maxRow: maxR, minCol: minC, maxCol: maxC });
        }
        s.setIsDrawing(false);
        s.setDrawStart(null);
        s.setPreview(null);
        return;
      }

      // Unified click-vs-drag: if barely moved and tool has onClick, treat as click
      const dist = Math.abs(pos.row - s.drawStart.row) + Math.abs(pos.col - s.drawStart.col);
      if (dist < 2 && tool.onClick) {
        s.pushUndo();
        const result = tool.onClick(pos, s.renderedGrid);
        if (result) {
          if (result.kind === 'create') {
            const newId = s.addNode(result.node);
            s.setSelection([newId]);
            if (tool.needsTextInput) {
              const key = getPrimaryTextKey(result.node.type);
              if (key) {
                const draftNode = {
                  ...result.node,
                  id: 'draft-node',
                  visible: true,
                  locked: false,
                  parentId: null,
                } as SceneNode;
                const text = getNodeText(draftNode, key);
                s.startEditing(newId, key, text?.length ?? 0);
              }
            }
            // Keep tool active — user can keep placing (Figma-style)
          } else if (result.kind === 'createMany') {
            s.applyNodes(result.nodes, { row: 0, col: 0 }, undefined, result.groupName);
          }
        }
      } else if (tool.onDragEnd) {
        s.pushUndo();
        const result = tool.onDragEnd(s.drawStart, pos, s.renderedGrid);
        if (result) {
          if (result.kind === 'create') {
            const newId = s.addNode(result.node);
            s.setSelection([newId]);
            if (tool.needsTextInput) {
              const key = getPrimaryTextKey(result.node.type);
              if (key) {
                const draftNode = {
                  ...result.node,
                  id: 'draft-node',
                  visible: true,
                  locked: false,
                  parentId: null,
                } as SceneNode;
                const text = getNodeText(draftNode, key);
                s.startEditing(newId, key, text?.length ?? 0);
              }
            }
            // Keep tool active — user can keep placing (Figma-style)
          } else if (result.kind === 'createMany') {
            s.applyNodes(result.nodes, { row: 0, col: 0 }, undefined, result.groupName);
          } else if (result.kind === 'delete') {
            s.removeNodes(result.nodeIds);
          }
        }
      }

      s.setIsDrawing(false);
      s.setDrawStart(null);
      s.setPreview(null);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    lastHoverRow = -1;
    lastHoverCol = -1;
    useSceneStore.getState().setHover(-1, -1);
    useSceneStore.getState().setPreview(null);
    handlePointerUp(e);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const s = useSceneStore.getState();
    if (s.activeTool !== 'select') return;

    const pos = getPosFromClient(e.currentTarget, e.clientX, e.clientY, cellWidth, cellHeight, scale);
    const hitId = hitTestPoint(s.document, pos.row, pos.col, s.drillScope);
    if (!hitId) return;

    const node = s.document.nodes.get(hitId);
    if (!node) return;

    s.setSelection([hitId]);

    if (node.type === 'group') {
      s.setDrillScope(hitId);
      return;
    }

    const region = detectTextRegion(node, pos.row, pos.col);
    if (region) {
      s.pushUndo();
      s.startEditing(hitId, region.key, region.cursorPos);
    }
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, handleDoubleClick };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeResizedBounds(
  orig: Bounds,
  corner: string,
  dRow: number,
  dCol: number
): Bounds {
  let { x, y, width, height } = orig;
  const minW = 2;
  const minH = 1;

  switch (corner) {
    case 'top-left':
      x += dCol;
      y += dRow;
      width -= dCol;
      height -= dRow;
      break;
    case 'top-right':
      y += dRow;
      width += dCol;
      height -= dRow;
      break;
    case 'bottom-left':
      x += dCol;
      width -= dCol;
      height += dRow;
      break;
    case 'bottom-right':
      width += dCol;
      height += dRow;
      break;
  }

  if (width < minW) { width = minW; }
  if (height < minH) { height = minH; }

  return { x, y, width, height };
}
