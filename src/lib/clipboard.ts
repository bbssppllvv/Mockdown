import { CharGrid } from './grid-model';
import { FONT_FAMILY, FONT_SIZE, ThemeColors, LIGHT_COLORS } from './constants';
import { drawGrid, RenderConfig } from './grid-renderer';

export async function copyAsMarkdown(grid: CharGrid): Promise<void> {
  const md = grid.toMarkdown();
  await navigator.clipboard.writeText(md);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function copyAsSvg(
  grid: CharGrid,
  cellWidth: number,
  cellHeight: number,
  charColor: string,
): Promise<void> {
  // Find actual content bounds to trim the SVG
  let maxRow = 0;
  let maxCol = 0;
  let hasContent = false;

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.getChar(r, c) !== ' ') {
        maxRow = r;
        maxCol = Math.max(maxCol, c);
        hasContent = true;
      }
    }
  }

  if (!hasContent) return;

  const svgWidth = (maxCol + 1) * cellWidth;
  const svgHeight = (maxRow + 1) * cellHeight;

  let elements = '';

  for (let r = 0; r <= maxRow; r++) {
    // Collect runs of consecutive non-space characters
    const runs: { startCol: number; text: string }[] = [];
    let currentRun: { startCol: number; text: string } | null = null;

    for (let c = 0; c <= maxCol; c++) {
      const ch = grid.getChar(r, c);
      if (ch !== ' ') {
        if (currentRun && c === currentRun.startCol + currentRun.text.length) {
          currentRun.text += ch;
        } else {
          if (currentRun) runs.push(currentRun);
          currentRun = { startCol: c, text: ch };
        }
      }
    }
    if (currentRun) runs.push(currentRun);
    if (runs.length === 0) continue;

    const y = (r * cellHeight + cellHeight / 2).toFixed(1);

    for (const run of runs) {
      const x = (run.startCol * cellWidth).toFixed(1);
      const escaped = escapeXml(run.text);
      if (run.text.length === 1) {
        elements += `  <text x="${x}" y="${y}">${escaped}</text>\n`;
      } else {
        // textLength forces exact grid-aligned spacing regardless of font
        const tl = (run.text.length * cellWidth).toFixed(1);
        elements += `  <text x="${x}" y="${y}" textLength="${tl}" lengthAdjust="spacing">${escaped}</text>\n`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(0)}" height="${svgHeight.toFixed(0)}" viewBox="0 0 ${svgWidth.toFixed(0)} ${svgHeight.toFixed(0)}">
<style>
  text {
    font-family: '${FONT_FAMILY}', 'Courier New', monospace;
    font-size: ${FONT_SIZE}px;
    fill: ${charColor};
    dominant-baseline: central;
  }
</style>
${elements}</svg>`;

  await navigator.clipboard.writeText(svg);
}

export async function copyAsImage(
  grid: CharGrid,
  cellWidth: number,
  cellHeight: number,
  colors: ThemeColors = LIGHT_COLORS,
): Promise<void> {
  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  const w = grid.cols * cellWidth;
  const h = grid.rows * cellHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const config: RenderConfig = { cellWidth, cellHeight, showGridLines: false };
  drawGrid(ctx, grid, config, null, null, false, null, null, null, colors);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create image')), 'image/png')
  );

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
}
