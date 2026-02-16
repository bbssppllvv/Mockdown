import { CharGrid } from './grid-model';

export async function copyAsText(grid: CharGrid): Promise<void> {
  const text = grid.toText();
  await navigator.clipboard.writeText(text);
}

export async function copyAsMarkdown(grid: CharGrid): Promise<void> {
  const md = grid.toMarkdown();
  await navigator.clipboard.writeText(md);
}
