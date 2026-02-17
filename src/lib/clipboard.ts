import { CharGrid } from './grid-model';

export async function copyAsMarkdown(grid: CharGrid): Promise<void> {
  const md = grid.toMarkdown();
  await navigator.clipboard.writeText(md);
}
