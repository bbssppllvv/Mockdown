'use client';

import { useState } from 'react';
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
  ChevronDown,
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
import { GridSizeSelector } from './GridSizeSelector';
import { CatLogo } from './CatLogo';
import { copyAsMarkdown } from '@/lib/clipboard';
import { toast } from 'sonner';

const ICON = "h-4 w-4";

type ToolEntry = { id: ToolId; label: string; icon: React.ReactNode };

interface ToolGroup {
  label: string;
  primary: ToolEntry[];
  secondary?: ToolEntry[];
}

// ── Interface tools (UI Elements → UX Patterns → Page Types) ────────────────

const interfaceGroups: ToolGroup[] = [
  {
    label: 'UI Elements',
    primary: [
      { id: 'button',   label: 'Button',   icon: <RectangleHorizontal className={ICON} /> },
      { id: 'input',    label: 'Input',     icon: <TextCursorInput className={ICON} /> },
      { id: 'dropdown', label: 'Dropdown',  icon: <ChevronsUpDown className={ICON} /> },
      { id: 'checkbox', label: 'Checkbox',  icon: <CheckSquare className={ICON} /> },
      { id: 'toggle',   label: 'Toggle',    icon: <ToggleLeft className={ICON} /> },
      { id: 'tabs',     label: 'Tabs',      icon: <SquareStack className={ICON} /> },
    ],
    secondary: [
      { id: 'search',     label: 'Search',     icon: <Search className={ICON} /> },
      { id: 'radio',      label: 'Radio',      icon: <CircleDot className={ICON} /> },
      { id: 'progress',   label: 'Progress',   icon: <Loader className={ICON} /> },
      { id: 'breadcrumb', label: 'Breadcrumb', icon: <ChevronRight className={ICON} /> },
      { id: 'pagination', label: 'Pagination', icon: <MoreHorizontal className={ICON} /> },
    ],
  },
  {
    label: 'UX Patterns',
    primary: [
      { id: 'card',  label: 'Card',    icon: <CreditCard className={ICON} /> },
      { id: 'table', label: 'Table',   icon: <Table className={ICON} /> },
      { id: 'nav',   label: 'Nav Bar', icon: <PanelTop className={ICON} /> },
      { id: 'list',  label: 'List',    icon: <List className={ICON} /> },
      { id: 'modal', label: 'Modal',   icon: <AppWindow className={ICON} /> },
    ],
    secondary: [
      { id: 'image',       label: 'Image',       icon: <Image className={ICON} /> },
      { id: 'placeholder', label: 'Placeholder', icon: <Frame className={ICON} /> },
      { id: 'hsplit',      label: 'HSplit',       icon: <PanelLeft className={ICON} /> },
    ],
  },
];

// ── Drawing tools (separate from interface) ─────────────────────────────────

const drawGroup: ToolGroup = {
  label: 'Draw',
  primary: [
    { id: 'pencil', label: 'Pencil', icon: <Pencil className={ICON} /> },
    { id: 'brush',  label: 'Brush',  icon: <Paintbrush className={ICON} /> },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className={ICON} /> },
  ],
  secondary: [
    { id: 'spray', label: 'Spray', icon: <SprayCan className={ICON} /> },
    { id: 'shade', label: 'Shade', icon: <Contrast className={ICON} /> },
    { id: 'fill',  label: 'Fill',  icon: <PaintBucket className={ICON} /> },
  ],
};

// Collect all secondary tool IDs for auto-expand
const allSecondaryIds = new Set<string>(
  [...interfaceGroups, drawGroup]
    .flatMap(g => g.secondary ?? [])
    .map(t => t.id)
);

export function Toolbar() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const toggleGroup = (label: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Auto-expand group if active tool is in its secondary list
  const isGroupExpanded = (g: ToolGroup): boolean => {
    if (expanded.has(g.label)) return true;
    if (g.secondary?.some(t => t.id === activeTool)) return true;
    return false;
  };

  const toolBtn = (t: ToolEntry) => {
    const isActive = activeTool === t.id;
    return (
      <button
        key={t.id}
        onClick={() => setActiveTool(t.id)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-100 ${
          isActive
            ? 'bg-[#2563eb] text-white'
            : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
        }`}
      >
        {t.icon}
        {t.label}
      </button>
    );
  };

  const renderGroup = (g: ToolGroup) => {
    const showSecondary = g.secondary && g.secondary.length > 0;
    const open = isGroupExpanded(g);

    return (
      <div key={g.label} className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider px-2.5 mb-0.5">
          {g.label}
        </span>
        {g.primary.map(toolBtn)}
        {showSecondary && (
          <>
            <button
              onClick={() => toggleGroup(g.label)}
              className="flex items-center gap-1 px-2.5 py-0.5 text-[10px] text-foreground/30 hover:text-foreground/50 transition-colors"
            >
              <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${open ? 'rotate-0' : '-rotate-90'}`} />
              more
            </button>
            {open && g.secondary!.map(toolBtn)}
          </>
        )}
      </div>
    );
  };

  return (
    <aside className="flex flex-col w-[192px] min-w-[192px] border-r border-border/60 bg-background select-none overflow-y-auto">
      <CatLogo />

      <div className="flex flex-col gap-4 px-2 pt-1 pb-4">
        {/* Generate — highlighted at top */}
        {toolBtn({ id: 'generate', label: 'Generate', icon: <Wand2 className={ICON} /> })}

        {/* Basics — always visible, no secondary */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider px-2.5 mb-0.5">Basics</span>
          {[
            { id: 'select' as ToolId, label: 'Select',  icon: <MousePointer2 className={ICON} /> },
            { id: 'text' as ToolId,   label: 'Text',    icon: <Type className={ICON} /> },
            { id: 'box' as ToolId,    label: 'Box',     icon: <Square className={ICON} /> },
            { id: 'line' as ToolId,   label: 'Line',    icon: <Minus className={ICON} /> },
            { id: 'arrow' as ToolId,  label: 'Arrow',   icon: <ArrowRight className={ICON} /> },
          ].map(toolBtn)}
        </div>

        {/* Interface groups: UI Elements, UX Patterns */}
        {interfaceGroups.map(renderGroup)}

        {/* Draw — separate section */}
        {renderGroup(drawGroup)}
      </div>

      <div className="flex-1" />

      {/* Bottom controls */}
      <div className="flex flex-col gap-2 px-2 pb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors disabled:opacity-20 disabled:pointer-events-none"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className={ICON} />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors disabled:opacity-20 disabled:pointer-events-none"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className={ICON} />
          </button>
          <button
            onClick={() => clearCanvas()}
            className="p-1.5 rounded-lg text-foreground/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 className={ICON} />
          </button>
          <button
            onClick={() => setShowGridLines(!showGridLines)}
            className={`p-1.5 rounded-lg transition-colors ${
              showGridLines
                ? 'text-[#2563eb] bg-[#2563eb]/10'
                : 'text-foreground/40 hover:bg-foreground/5 hover:text-foreground'
            }`}
            title="Toggle grid lines"
          >
            <Grid3x3 className={ICON} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors"
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? <Moon className={ICON} /> : <Sun className={ICON} />}
          </button>
          <div className="flex-1" />
          <GridSizeSelector />
        </div>

        <button
          onClick={async () => {
            await copyAsMarkdown(grid);
            toast.success('Copied!');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#2563eb]/90 transition-colors"
        >
          <Copy className={ICON} />
          Copy Markdown
        </button>
      </div>
    </aside>
  );
}
