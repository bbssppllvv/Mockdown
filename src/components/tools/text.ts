import { DrawingTool, GridPos, DrawResult } from './types';

export const textTool: DrawingTool = {
  id: 'text',
  label: 'Text',
  icon: 'Type',
  needsTextInput: true,

  onClick(pos: GridPos): DrawResult | null {
    // Place cursor, text is entered via keyboard in text mode
    return { chars: [] };
  },

  onTextInput(pos: GridPos, text: string): DrawResult | null {
    if (!text) return null;
    const chars = text.split('').map((ch, i) => ({
      row: pos.row,
      col: pos.col + i,
      char: ch,
    }));
    return { chars };
  },
};
