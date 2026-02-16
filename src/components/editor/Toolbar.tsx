'use client';

import {
  MousePointer2,
  Type,
  Square,
  Minus,
  ArrowRight,
  Image,
  RectangleHorizontal,
  CheckSquare,
  CircleDot,
  TextCursorInput,
  ChevronsUpDown,
  Eraser,
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
// import { RobotLogo } from './RobotLogo';
// import { MascotLogo } from './MascotLogo';
import { copyAsMarkdown } from '@/lib/clipboard';
import { toast } from 'sonner';

const ICON = "h-4 w-4";

interface ToolGroup {
  label: string;
  tools: { id: ToolId; label: string; icon: React.ReactNode }[];
}

const groups: ToolGroup[] = [
  {
    label: 'Edit',
    tools: [
      { id: 'select', label: 'Select',      icon: <MousePointer2 className={ICON} /> },
      { id: 'cursor', label: 'Text',        icon: <Type className={ICON} /> },
      { id: 'box',    label: 'Box',         icon: <Square className={ICON} /> },
      { id: 'line',   label: 'Line',        icon: <Minus className={ICON} /> },
      { id: 'arrow',  label: 'Arrow',       icon: <ArrowRight className={ICON} /> },
      { id: 'image',  label: 'Image',       icon: <Image className={ICON} /> },
    ],
  },
  {
    label: 'Widgets',
    tools: [
      { id: 'button',   label: 'Button',     icon: <RectangleHorizontal className={ICON} /> },
      { id: 'checkbox', label: 'Checkbox',   icon: <CheckSquare className={ICON} /> },
      { id: 'radio',   label: 'Radio Button', icon: <CircleDot className={ICON} /> },
      { id: 'input',   label: 'Text Input',  icon: <TextCursorInput className={ICON} /> },
      { id: 'dropdown', label: 'Dropdown',   icon: <ChevronsUpDown className={ICON} /> },
    ],
  },
];

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const showGridLines = useEditorStore((s) => s.showGridLines);
  const setShowGridLines = useEditorStore((s) => s.setShowGridLines);
  const grid = useEditorStore((s) => s.grid);

  const toolBtn = (id: ToolId, label: string, icon: React.ReactNode) => {
    const isActive = activeTool === id;
    return (
      <button
        key={id}
        onClick={() => setActiveTool(id)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-100 ${
          isActive
            ? 'bg-[#2563eb] text-white'
            : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <aside className="flex flex-col w-[192px] min-w-[192px] border-r border-border/60 bg-background select-none">
      <CatLogo />

      {/* Tool groups */}
      <div className="flex flex-col gap-4 px-2 pt-1">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider px-2.5 mb-0.5">{g.label}</span>
            {g.tools.map((t) => toolBtn(t.id, t.label, t.icon))}
          </div>
        ))}

        {/* Eraser — standalone */}
        <div className="flex flex-col gap-0.5">
          {toolBtn('eraser', 'Eraser', <Eraser className={ICON} />)}
        </div>

        {/* Magic — highlighted */}
        {toolBtn('magic', 'Magic Tool', <Wand2 className={ICON} />)}
      </div>

      <div className="flex-1" />

      {/* Bottom controls */}
      <div className="flex flex-col gap-2 px-2 pb-3">
        {/* Undo / Redo / Grid */}
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
          <div className="flex-1" />
          <GridSizeSelector />
        </div>

        {/* Copy CTA */}
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
