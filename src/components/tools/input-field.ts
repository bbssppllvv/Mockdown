import { DrawingTool, GridPos, DrawResult } from './types';

export const inputFieldTool: DrawingTool = {
  id: 'input',
  label: 'Input',
  icon: 'TextCursorInput',

  onClick(pos: GridPos): DrawResult | null {
    const text = '[___________]';
    const chars = text.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },
};
