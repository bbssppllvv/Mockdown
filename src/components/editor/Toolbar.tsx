'use client';

import {
  MousePointer2,
  Type,
  Square,
  Minus,
  ArrowRight,
  Image,
  CreditCard,
  Table,
  PanelLeft,
  PanelTop,
  SquareStack,
  List,
  Frame,
  AppWindow,
  RectangleHorizontal,
  CheckSquare,
  CircleDot,
  TextCursorInput,
  ChevronsUpDown,
  Search,
  ToggleLeft,
  Pencil,
  Paintbrush,
  SprayCan,
  Contrast,
  PaintBucket,
  Eraser,
  Loader,
  ChevronRight,
  MoreHorizontal,
  Sun,
  Moon,
  Trash2,
  Wand2,
  Undo2,
  Redo2,
  Grid3x3,
  Copy,
} from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { ToolId } from '@/lib/constants';
import { CatLogo } from './CatLogo';
import { ToolDropdown, ToolEntry } from './ToolDropdown';
import { copyAsMarkdown } from '@/lib/clipboard';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ICON = 'h-4 w-4';

// ── Tool groups ──────────────────────────────────────────────────────────────

const widgetTools: ToolEntry[] = [
  { id: 'button', label: 'Button', icon: <RectangleHorizontal className={ICON} /> },
  { id: 'input', label: 'Input', icon: <TextCursorInput className={ICON} /> },
  { id: 'dropdown', label: 'Dropdown', icon: <ChevronsUpDown className={ICON} /> },
  { id: 'checkbox', label: 'Checkbox', icon: <CheckSquare className={ICON} /> },
  { id: 'toggle', label: 'Toggle', icon: <ToggleLeft className={ICON} /> },
  { id: 'tabs', label: 'Tabs', icon: <SquareStack className={ICON} /> },
  { id: 'search', label: 'Search', icon: <Search className={ICON} /> },
  { id: 'radio', label: 'Radio', icon: <CircleDot className={ICON} /> },
  { id: 'progress', label: 'Progress', icon: <Loader className={ICON} /> },
  { id: 'breadcrumb', label: 'Breadcrumb', icon: <ChevronRight className={ICON} /> },
  { id: 'pagination', label: 'Pagination', icon: <MoreHorizontal className={ICON} /> },
];

const layoutTools: ToolEntry[] = [
  { id: 'card', label: 'Card', icon: <CreditCard className={ICON} /> },
  { id: 'table', label: 'Table', icon: <Table className={ICON} /> },
  { id: 'nav', label: 'Nav Bar', icon: <PanelTop className={ICON} /> },
  { id: 'list', label: 'List', icon: <List className={ICON} /> },
  { id: 'modal', label: 'Modal', icon: <AppWindow className={ICON} /> },
  { id: 'image', label: 'Image', icon: <Image className={ICON} /> },
  { id: 'placeholder', label: 'Placeholder', icon: <Frame className={ICON} /> },
  { id: 'hsplit', label: 'HSplit', icon: <PanelLeft className={ICON} /> },
];

const drawTools: ToolEntry[] = [
  { id: 'pencil', label: 'Pencil', icon: <Pencil className={ICON} /> },
  { id: 'brush', label: 'Brush', icon: <Paintbrush className={ICON} /> },
  { id: 'eraser', label: 'Eraser', icon: <Eraser className={ICON} /> },
  { id: 'spray', label: 'Spray', icon: <SprayCan className={ICON} /> },
  { id: 'shade', label: 'Shade', icon: <Contrast className={ICON} /> },
  { id: 'fill', label: 'Fill', icon: <PaintBucket className={ICON} /> },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ToolButton({ id, label, icon }: ToolEntry) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const isActive = activeTool === id;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setActiveTool(id)}
          className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-100 ${
            isActive
              ? 'bg-[#2563eb] text-white'
              : 'text-foreground/50 hover:bg-foreground/5 hover:text-foreground'
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function UtilButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-100 ${
            active
              ? 'text-[#2563eb] bg-[#2563eb]/10'
              : danger
                ? 'text-foreground/40 hover:bg-red-500/10 hover:text-red-500'
                : 'text-foreground/40 hover:bg-foreground/5 hover:text-foreground'
          } disabled:opacity-20 disabled:pointer-events-none`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const showGridLines = useEditorStore((s) => s.showGridLines);
  const setShowGridLines = useEditorStore((s) => s.setShowGridLines);
  const grid = useEditorStore((s) => s.renderedGrid);
  const clearCanvas = useEditorStore((s) => s.clearCanvas);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);

  return (
    <aside className="flex flex-col items-center w-14 min-w-14 border-r border-border/60 bg-background select-none py-2 overflow-y-auto">
      {/* Cat logo */}
      <CatLogo compact />

      <Separator className="w-6 my-1.5" />

      {/* Basic tools */}
      <div className="flex flex-col items-center gap-0.5">
        <ToolButton id="select" label="Select" icon={<MousePointer2 className={ICON} />} />
        <ToolButton id="text" label="Text" icon={<Type className={ICON} />} />
        <ToolButton id="box" label="Box" icon={<Square className={ICON} />} />
        <ToolButton id="line" label="Line" icon={<Minus className={ICON} />} />
        <ToolButton id="arrow" label="Arrow" icon={<ArrowRight className={ICON} />} />
      </div>

      <Separator className="w-6 my-1.5" />

      {/* Tool group flyouts */}
      <div className="flex flex-col items-center gap-0.5">
        <ToolDropdown
          label="Widgets"
          defaultIcon={<RectangleHorizontal className={ICON} />}
          tools={widgetTools}
          side="right"
        />
        <ToolDropdown
          label="Layout"
          defaultIcon={<CreditCard className={ICON} />}
          tools={layoutTools}
          side="right"
        />
        <ToolDropdown
          label="Draw"
          defaultIcon={<Pencil className={ICON} />}
          tools={drawTools}
          side="right"
        />
      </div>

      <Separator className="w-6 my-1.5" />

      {/* Generate */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setActiveTool('generate')}
            className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-100 ${
              activeTool === 'generate'
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#2563eb]/10 text-[#2563eb] hover:bg-[#2563eb]/20'
            }`}
          >
            <Wand2 className={ICON} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Generate
        </TooltipContent>
      </Tooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Utilities */}
      <div className="flex flex-col items-center gap-0.5">
        <UtilButton
          icon={<Undo2 className={ICON} />}
          label="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={undoStack.length === 0}
        />
        <UtilButton
          icon={<Redo2 className={ICON} />}
          label="Redo (Ctrl+Shift+Z)"
          onClick={redo}
          disabled={redoStack.length === 0}
        />
      </div>

      <Separator className="w-6 my-1.5" />

      <div className="flex flex-col items-center gap-0.5">
        <UtilButton
          icon={<Grid3x3 className={ICON} />}
          label="Toggle grid lines"
          onClick={() => setShowGridLines(!showGridLines)}
          active={showGridLines}
        />
        <UtilButton
          icon={theme === 'light' ? <Moon className={ICON} /> : <Sun className={ICON} />}
          label={theme === 'light' ? 'Dark mode' : 'Light mode'}
          onClick={toggleTheme}
        />
        <UtilButton
          icon={<Trash2 className={ICON} />}
          label="Clear canvas"
          onClick={() => clearCanvas()}
          danger
        />
      </div>

      <Separator className="w-6 my-1.5" />

      <UtilButton
        icon={<Copy className={ICON} />}
        label="Copy Markdown"
        onClick={async () => {
          await copyAsMarkdown(grid);
          toast.success('Copied!');
        }}
      />
    </aside>
  );
}
