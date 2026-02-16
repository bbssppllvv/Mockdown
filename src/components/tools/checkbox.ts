import { DrawingTool, GridPos, DrawResult } from './types';

export const checkboxTool: DrawingTool = {
  id: 'checkbox',
  label: 'Checkbox',
  icon: 'CheckSquare',
  needsTextInput: true,

  onClick(pos: GridPos): DrawResult | null {
    const text = '[ ] Label';
    const chars = text.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },

  onTextInput(pos: GridPos, text: string): DrawResult | null {
    const label = text || 'Label';
    const str = `[ ] ${label}`;
    const chars = str.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },
};
