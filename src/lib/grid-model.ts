import { GRID_COLS, GRID_ROWS } from './constants';

export class CharGrid {
  cells: string[][];
  rows: number;
  cols: number;

  constructor(rows = GRID_ROWS, cols = GRID_COLS) {
    this.rows = rows;
    this.cols = cols;
    this.cells = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ' ')
    );
  }

  getChar(row: number, col: number): string {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return ' ';
    return this.cells[row][col];
  }

  setChar(row: number, col: number, char: string): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
    this.cells[row][col] = char;
  }

  writeRegion(startRow: number, startCol: number, chars: string[][]): void {
    for (let r = 0; r < chars.length; r++) {
      for (let c = 0; c < chars[r].length; c++) {
        const ch = chars[r][c];
        if (ch !== '\0') {
          this.setChar(startRow + r, startCol + c, ch);
        }
      }
    }
  }

  clearRegion(startRow: number, startCol: number, height: number, width: number): void {
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        this.setChar(startRow + r, startCol + c, ' ');
      }
    }
  }

  toText(): string {
    return this.cells
      .map((row) => row.join('').replace(/\s+$/, ''))
      .join('\n')
      .replace(/(\n\s*)+$/, '\n');
  }

  toMarkdown(): string {
    return '```\n' + this.toText() + '```\n';
  }

  clone(): CharGrid {
    const copy = new CharGrid(this.rows, this.cols);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        copy.cells[r][c] = this.cells[r][c];
      }
    }
    return copy;
  }
}
