import { DrawingTool, GridPos, DrawResult } from './types';

export const dropdownTool: DrawingTool = {
  id: 'dropdown',
  label: 'Dropdown',
  icon: 'ChevronDown',
  needsTextInput: true,

  onClick(pos: GridPos): DrawResult | null {
    const text = '[v Option   ]';
    const chars = text.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },

  onTextInput(pos: GridPos, text: string): DrawResult | null {
    const label = text || 'Option';
    const padded = label.padEnd(10, ' ');
    const str = `[v ${padded}]`;
    const chars = str.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },
};
