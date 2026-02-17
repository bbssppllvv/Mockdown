import { DrawingTool } from './types';
import { selectTool } from './select';
import { textTool } from './text';
import { boxTool } from './box';
import { lineTool } from './line';
import { arrowTool } from './arrow';
import { imageTool } from './image';
import { cardTool } from './card';
import { tableTool } from './table';
import { hsplitTool } from './hsplit';
import { navTool } from './nav';
import { tabsTool } from './tabs';
import { listTool } from './list';
import { placeholderTool } from './placeholder';
import { modalTool } from './modal';
import { pencilTool } from './pencil';
import { brushTool } from './brush';
import { sprayTool } from './spray';
import { shadeTool } from './shade';
import { fillTool } from './fill';
import { eraserTool } from './eraser';
import { smudgeTool } from './smudge';
import { scatterTool } from './scatter';
import { buttonTool } from './button';
import { checkboxTool } from './checkbox';
import { radioTool } from './radio';
import { inputFieldTool } from './input-field';
import { dropdownTool } from './dropdown';
import { searchTool } from './search';
import { toggleTool } from './toggle';
import { progressTool } from './progress';
import { breadcrumbTool } from './breadcrumb';
import { paginationTool } from './pagination';
import { generateTool } from './generate';
import { ToolId } from '@/lib/constants';

const toolMap: Record<ToolId, DrawingTool> = {
  select: selectTool,
  text: textTool,
  box: boxTool,
  line: lineTool,
  arrow: arrowTool,
  image: imageTool,
  card: cardTool,
  table: tableTool,
  hsplit: hsplitTool,
  nav: navTool,
  tabs: tabsTool,
  list: listTool,
  placeholder: placeholderTool,
  modal: modalTool,
  pencil: pencilTool,
  brush: brushTool,
  spray: sprayTool,
  shade: shadeTool,
  fill: fillTool,
  eraser: eraserTool,
  smudge: smudgeTool,
  scatter: scatterTool,
  button: buttonTool,
  checkbox: checkboxTool,
  radio: radioTool,
  input: inputFieldTool,
  dropdown: dropdownTool,
  search: searchTool,
  toggle: toggleTool,
  progress: progressTool,
  breadcrumb: breadcrumbTool,
  pagination: paginationTool,
  generate: generateTool,
};

export function getTool(id: ToolId): DrawingTool {
  return toolMap[id];
}

export { toolMap };
