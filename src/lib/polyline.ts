import { BOX, dirsToBoxChar, BoxDirs } from './box-chars';

export interface GridPos {
  row: number;
  col: number;
}

export interface PolylineCell {
  row: number;
  col: number;
  char: string;
}

/**
 * Tracks waypoints during a polyline drag.
 * Call reset() on drag start, update() on each drag frame,
 * and getPoints(current) to get the full path.
 */
export class PolylineTracker {
  waypoints: GridPos[] = [];
  private lastPos: GridPos | null = null;
  private lastDir: 'h' | 'v' | null = null;

  /** Minimum perpendicular cells from the current axis before a turn is committed */
  private static TURN_THRESHOLD = 2;

  reset(start: GridPos) {
    this.waypoints = [{ ...start }];
    this.lastPos = { ...start };
    this.lastDir = null;
  }

  update(current: GridPos) {
    if (!this.lastPos) return;

    const dr = Math.abs(current.row - this.lastPos.row);
    const dc = Math.abs(current.col - this.lastPos.col);

    // Skip if no movement at all
    if (dr === 0 && dc === 0) return;

    // First move: establish direction (require clear dominance)
    if (this.lastDir === null) {
      if (dc > dr) this.lastDir = 'h';
      else if (dr > dc) this.lastDir = 'v';
      // If equal, wait for a clearer signal
      this.lastPos = { ...current };
      return;
    }

    // Determine candidate direction from incremental movement
    let candidateDir: 'h' | 'v';
    if (dc > dr) candidateDir = 'h';
    else if (dr > dc) candidateDir = 'v';
    else candidateDir = this.lastDir; // equal → keep current

    if (candidateDir !== this.lastDir) {
      // Incremental direction changed — verify with perpendicular threshold.
      // Measure how far the cursor has drifted from the current axis
      // (relative to the last waypoint) to filter out jitter.
      const lastWP = this.waypoints[this.waypoints.length - 1];
      const perpDev = this.lastDir === 'h'
        ? Math.abs(current.row - lastWP.row)
        : Math.abs(current.col - lastWP.col);

      if (perpDev < PolylineTracker.TURN_THRESHOLD) {
        // Below threshold — ignore direction change (jitter)
        this.lastPos = { ...current };
        return;
      }

      // Confirmed turn — commit a corner at the axis-projected position
      let corner: GridPos;
      if (this.lastDir === 'h') {
        corner = { row: lastWP.row, col: this.lastPos.col };
      } else {
        corner = { row: this.lastPos.row, col: lastWP.col };
      }

      if (corner.row !== lastWP.row || corner.col !== lastWP.col) {
        this.waypoints.push(corner);
      }
      this.lastDir = candidateDir;
    }

    this.lastPos = { ...current };
  }

  /**
   * Build the complete point list from committed waypoints + current mouse pos.
   * Handles the final unfinished segment with an L-shape if needed.
   */
  getPoints(current: GridPos): GridPos[] {
    if (this.waypoints.length === 0) return [current];
    const points = [...this.waypoints];
    const lastWP = points[points.length - 1];

    if (current.row === lastWP.row && current.col === lastWP.col) {
      return points;
    }

    // Axis-aligned — just append
    if (current.row === lastWP.row || current.col === lastWP.col) {
      points.push(current);
      return points;
    }

    // Non-aligned — route as L-shape based on current direction
    if (this.lastDir === 'v') {
      points.push({ row: current.row, col: lastWP.col });
    } else {
      // 'h' or null — horizontal first
      points.push({ row: lastWP.row, col: current.col });
    }
    points.push(current);
    return points;
  }
}

/**
 * Compute the corner character at a waypoint connecting two segments.
 */
function getCornerChar(from: GridPos, corner: GridPos, to: GridPos): string {
  const dirs: BoxDirs = { up: false, down: false, left: false, right: false };

  if (from.row < corner.row) dirs.up = true;
  else if (from.row > corner.row) dirs.down = true;
  if (from.col < corner.col) dirs.left = true;
  else if (from.col > corner.col) dirs.right = true;

  if (to.row < corner.row) dirs.up = true;
  else if (to.row > corner.row) dirs.down = true;
  if (to.col < corner.col) dirs.left = true;
  else if (to.col > corner.col) dirs.right = true;

  return dirsToBoxChar(dirs);
}

/**
 * Build the cells for a polyline path.
 * @param points - array of waypoints (each consecutive pair must be axis-aligned)
 * @param arrowHead - if true, draw an arrowhead at the last point
 */
export function buildPolylineCells(points: GridPos[], arrowHead: boolean): PolylineCell[] {
  if (points.length < 2) return [];

  const cells = new Map<string, PolylineCell>();

  // Draw segments between consecutive points
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];

    if (from.row === to.row) {
      const minC = Math.min(from.col, to.col);
      const maxC = Math.max(from.col, to.col);
      for (let c = minC; c <= maxC; c++) {
        cells.set(`${from.row},${c}`, { row: from.row, col: c, char: BOX.H });
      }
    } else if (from.col === to.col) {
      const minR = Math.min(from.row, to.row);
      const maxR = Math.max(from.row, to.row);
      for (let r = minR; r <= maxR; r++) {
        cells.set(`${r},${from.col}`, { row: r, col: from.col, char: BOX.V });
      }
    }
  }

  // Corner characters at intermediate waypoints
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const ch = getCornerChar(prev, curr, next);
    cells.set(`${curr.row},${curr.col}`, { row: curr.row, col: curr.col, char: ch });
  }

  // Arrowhead at the end
  if (arrowHead && points.length >= 2) {
    const end = points[points.length - 1];
    const prev = points[points.length - 2];

    let ch: string;
    if (end.col > prev.col) ch = '→';
    else if (end.col < prev.col) ch = '←';
    else if (end.row > prev.row) ch = '↓';
    else ch = '↑';

    cells.set(`${end.row},${end.col}`, { row: end.row, col: end.col, char: ch });
  }

  return Array.from(cells.values());
}
