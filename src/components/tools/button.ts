import { DrawingTool, GridPos, DrawResult } from './types';

export const buttonTool: DrawingTool = {
  id: 'button',
  label: 'Button',
  icon: 'RectangleHorizontal',
  needsTextInput: true,

  onClick(pos: GridPos): DrawResult | null {
    // Place a default button template
    const label = 'OK';
    const text = `[ ${label} ]`;
    const chars = text.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },

  onTextInput(pos: GridPos, text: string): DrawResult | null {
    const label = text || 'OK';
    const str = `[ ${label} ]`;
    const chars = str.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },
};
