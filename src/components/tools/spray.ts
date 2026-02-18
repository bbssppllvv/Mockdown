import { DrawingTool, GridPos, PreviewCell } from './types';
import { CharGrid } from '@/lib/grid-model';
import { SparseCell } from '@/lib/scene/types';
import { useSceneStore } from '@/hooks/use-scene-store';

const SPRAY_CHARS = ['\u2591', '\u2592', '\u2593', '\u00B7', '\u2219'];

function sprayAt(row: number, col: number, grid: CharGrid): PreviewCell[] {
  const spraySettings = useSceneStore.getState().toolSettings.spray;
  const radius = Math.max(1, Math.min(12, spraySettings.radius));
  const density = Math.max(1, Math.min(30, spraySettings.density));
  const cells: PreviewCell[] = [];
  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const dr = Math.round(Math.sin(angle) * dist);
    const dc = Math.round(Math.cos(angle) * dist);
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
      const ch = SPRAY_CHARS[Math.floor(Math.random() * SPRAY_CHARS.length)];
      cells.push({ row: r, col: c, char: ch });
    }
  }
  return cells;
}

export const sprayTool: DrawingTool = {
  id: 'spray',
  label: 'Spray',
  icon: 'SprayCan',
  continuous: true,

  onDragStart(pos: GridPos, grid: CharGrid): PreviewCell[] | null {
    return sprayAt(pos.row, pos.col, grid);
  },

  onContinuousDrag(_prev: GridPos, current: GridPos, grid: CharGrid, accumulator: SparseCell[]): PreviewCell[] | null {
    const cells = sprayAt(current.row, current.col, grid);
    for (const c of cells) {
      accumulator.push({ row: c.row, col: c.col, char: c.char });
    }
    return cells;
  },

  onDragEnd(): null {
    return null;
  },
};
