import { DrawingTool } from './types';
import { selectTool } from './select';
import { cursorTool } from './cursor';
import { boxTool } from './box';
import { lineTool } from './line';
import { arrowTool } from './arrow';
import { imageTool } from './image';
import { buttonTool } from './button';
import { checkboxTool } from './checkbox';
import { radioTool } from './radio';
import { inputFieldTool } from './input-field';
import { dropdownTool } from './dropdown';
import { eraserTool } from './eraser';
import { magicTool } from './magic';
import { ToolId } from '@/lib/constants';

const toolMap: Record<ToolId, DrawingTool> = {
  select: selectTool,
  cursor: cursorTool,
  box: boxTool,
  line: lineTool,
  arrow: arrowTool,
  image: imageTool,
  button: buttonTool,
  checkbox: checkboxTool,
  radio: radioTool,
  input: inputFieldTool,
  dropdown: dropdownTool,
  eraser: eraserTool,
  magic: magicTool,
};

export function getTool(id: ToolId): DrawingTool {
  return toolMap[id];
}

export { toolMap };
