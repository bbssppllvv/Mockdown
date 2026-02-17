import { DrawingTool, GridPos, PreviewCell, ToolResult } from './types';
import { CharGrid } from '@/lib/grid-model';
import { PolylineTracker, buildPolylineCells } from '@/lib/polyline';

const tracker = new PolylineTracker();

export const lineTool: DrawingTool = {
  id: 'line',
  label: 'Line',
  icon: 'Minus',

  onDragStart(pos: GridPos) {
    tracker.reset(pos);
    return [];
  },

  onDrag(start: GridPos, current: GridPos, _grid: CharGrid): PreviewCell[] | null {
    tracker.update(current);
    const points = tracker.getPoints(current);
    return buildPolylineCells(points, false);
  },

  onDragEnd(start: GridPos, end: GridPos, _grid: CharGrid): ToolResult {
    tracker.update(end);
    const points = tracker.getPoints(end);
    const cells = buildPolylineCells(points, false);
    if (cells.length === 0) return null;

    // Compute bounds from the points
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const p of points) {
      if (p.row < minR) minR = p.row;
      if (p.row > maxR) maxR = p.row;
      if (p.col < minC) minC = p.col;
      if (p.col > maxC) maxC = p.col;
    }

    return {
      kind: 'create',
      node: {
        type: 'line',
        name: 'Line',
        bounds: { x: minC, y: minR, width: maxC - minC + 1, height: maxR - minR + 1 },
        points: points.map(p => ({ row: p.row, col: p.col })),
      },
    };
  },
};
