'use client';

import { useState, useCallback } from 'react';
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
  Droplets,
  Sparkles,
  Loader,
  MoreHorizontal,
  Sun,
  Moon,
  Trash2,
  Wand2,
  Undo2,
  Redo2,
  Grid3x3,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { ToolId } from '@/lib/constants';
import { toolMap } from '@/components/tools/registry';
import { copyAsMarkdown } from '@/lib/clipboard';
import { GridSizeSelector } from './GridSizeSelector';
import { toast } from 'sonner';

const IC = 'h-5 w-5';
const IC_SM = 'h-4 w-4';
const IC_XS = 'h-3.5 w-3.5';

type ToolEntry = { id: ToolId; label: string; icon: React.ReactNode };

// Primary bar tools (always visible)
const barTools: ToolEntry[] = [
  { id: 'select', label: 'Select', icon: <MousePointer2 className={IC} /> },
  { id: 'text', label: 'Text', icon: <Type className={IC} /> },
  { id: 'box', label: 'Box', icon: <Square className={IC} /> },
  { id: 'pencil', label: 'Pencil', icon: <Pencil className={IC} /> },
  { id: 'line', label: 'Line', icon: <Minus className={IC} /> },
  { id: 'button', label: 'Button', icon: <RectangleHorizontal className={IC} /> },
];

// Sheet tools grouped
const sheetBasics: ToolEntry[] = [
  { id: 'line', label: 'Line', icon: <Minus className={IC_SM} /> },
  { id: 'arrow', label: 'Arrow', icon: <ArrowRight className={IC_SM} /> },
];

const sheetUIElements: ToolEntry[] = [
  { id: 'button', label: 'Button', icon: <RectangleHorizontal className={IC_SM} /> },
  { id: 'input', label: 'Input', icon: <TextCursorInput className={IC_SM} /> },
  { id: 'card', label: 'Card', icon: <CreditCard className={IC_SM} /> },
  { id: 'table', label: 'Table', icon: <Table className={IC_SM} /> },
  { id: 'modal', label: 'Modal', icon: <AppWindow className={IC_SM} /> },
  { id: 'checkbox', label: 'Checkbox', icon: <CheckSquare className={IC_SM} /> },
  { id: 'radio', label: 'Radio', icon: <CircleDot className={IC_SM} /> },
  { id: 'dropdown', label: 'Dropdown', icon: <ChevronsUpDown className={IC_SM} /> },
  { id: 'toggle', label: 'Toggle', icon: <ToggleLeft className={IC_SM} /> },
  { id: 'tabs', label: 'Tabs', icon: <SquareStack className={IC_SM} /> },
  { id: 'search', label: 'Search', icon: <Search className={IC_SM} /> },
  { id: 'progress', label: 'Progress', icon: <Loader className={IC_SM} /> },
  { id: 'breadcrumb', label: 'Breadcrumb', icon: <ChevronRight className={IC_SM} /> },
  { id: 'pagination', label: 'Pagination', icon: <MoreHorizontal className={IC_SM} /> },
  { id: 'nav', label: 'Nav', icon: <PanelTop className={IC_SM} /> },
  { id: 'list', label: 'List', icon: <List className={IC_SM} /> },
  { id: 'placeholder', label: 'Placeholder', icon: <Frame className={IC_SM} /> },
  { id: 'hsplit', label: 'HSplit', icon: <PanelLeft className={IC_SM} /> },
  { id: 'image', label: 'Image', icon: <Image className={IC_SM} /> },
];

const sheetDraw: ToolEntry[] = [
  { id: 'eraser', label: 'Eraser', icon: <Eraser className={IC_SM} /> },
  { id: 'brush', label: 'Brush', icon: <Paintbrush className={IC_SM} /> },
  { id: 'spray', label: 'Spray', icon: <SprayCan className={IC_SM} /> },
  { id: 'shade', label: 'Shade', icon: <Contrast className={IC_SM} /> },
  { id: 'fill', label: 'Fill', icon: <PaintBucket className={IC_SM} /> },
  { id: 'smudge', label: 'Smudge', icon: <Droplets className={IC_SM} /> },
  { id: 'scatter', label: 'Scatter', icon: <Sparkles className={IC_SM} /> },
];

export function MobileToolbar() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const showGridLines = useEditorStore((s) => s.showGridLines);
  const setShowGridLines = useEditorStore((s) => s.setShowGridLines);
  const clearCanvas = useEditorStore((s) => s.clearCanvas);
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);
  const cursorRow = useEditorStore((s) => s.cursorRow);
  const cursorCol = useEditorStore((s) => s.cursorCol);
  const grid = useEditorStore((s) => s.renderedGrid);

  const toolLabel = toolMap[activeTool]?.label ?? activeTool;
  const canvasHasContent = undoStack.length > 0;

  const selectTool = useCallback(
    (id: ToolId) => {
      setActiveTool(id);
      setSheetOpen(false);
    },
    [setActiveTool],
  );

  const sheetToolBtn = (t: ToolEntry) => {
    const isActive = activeTool === t.id;
    return (
      <button
        key={t.id}
        onClick={() => selectTool(t.id)}
        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-[10px] font-medium transition-colors ${
          isActive
            ? 'bg-[#2563eb] text-white'
            : 'text-foreground/70 active:bg-foreground/10'
        }`}
      >
        {t.icon}
        <span className="truncate w-full text-center leading-tight">{t.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* ── Floating top-left: Undo / Redo / Clear ── */}
      <div
        className="fixed top-3 left-3 z-50 md:hidden flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border/60 rounded-xl px-1 py-0.5 shadow-sm"
        style={{ top: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="p-1.5 rounded-lg text-foreground/50 active:bg-foreground/10 disabled:opacity-20 disabled:pointer-events-none"
        >
          <Undo2 className={IC_XS} />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-1.5 rounded-lg text-foreground/50 active:bg-foreground/10 disabled:opacity-20 disabled:pointer-events-none"
        >
          <Redo2 className={IC_XS} />
        </button>
        {canvasHasContent && (
          <>
            <div className="w-px h-4 bg-border/60" />
            <button
              onClick={() => clearCanvas()}
              className="p-1.5 rounded-lg text-red-500/70 active:bg-red-500/10"
            >
              <Trash2 className={IC_XS} />
            </button>
          </>
        )}
      </div>

      {/* ── Floating top-right: AI + Copy ── */}
      <div
        className="fixed right-3 z-50 md:hidden flex items-center gap-1.5"
        style={{ top: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={() => setActiveTool('generate')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold transition-colors ${
            activeTool === 'generate'
              ? 'bg-[#2563eb] text-white'
              : 'bg-background/90 backdrop-blur-sm border border-border/60 text-foreground/70 active:bg-foreground/10'
          }`}
        >
          <Wand2 className={IC_XS} />
          AI
        </button>
        <button
          onClick={async () => {
            await copyAsMarkdown(grid);
            toast.success('Copied!');
          }}
          className="flex items-center gap-1.5 bg-[#2563eb] text-white rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold active:bg-[#2563eb]/80"
        >
          <Copy className={IC_XS} />
          Copy
        </button>
      </div>

      {/* ── Bottom sheet backdrop + panel ── */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/30 md:hidden"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[95] md:hidden animate-in slide-in-from-bottom duration-200">
            <div
              className="bg-background border-t border-border/60 rounded-t-2xl max-h-[70vh] overflow-y-auto"
              style={{ paddingBottom: 'calc(52px + env(safe-area-inset-bottom, 34px))' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-foreground/20" />
              </div>

              {/* Status info */}
              <div className="flex items-center gap-3 px-4 py-2">
                <span className="uppercase font-bold px-2 py-0.5 rounded-lg text-[10px] tracking-wider bg-[#2563eb] text-white">
                  {toolLabel}
                </span>
                <span className="text-xs font-mono text-foreground/40">
                  Ln {cursorRow + 1}, Col {cursorCol + 1}
                </span>
              </div>

              {/* Basics */}
              <div className="px-4 pt-2">
                <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">
                  Basics
                </span>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {sheetBasics.map(sheetToolBtn)}
                </div>
              </div>

              {/* UI Elements */}
              <div className="px-4 pt-3">
                <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">
                  UI Elements
                </span>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {sheetUIElements.map(sheetToolBtn)}
                </div>
              </div>

              {/* Draw */}
              <div className="px-4 pt-3">
                <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">
                  Draw
                </span>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {sheetDraw.map(sheetToolBtn)}
                </div>
              </div>

              {/* Settings row */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-wrap">
                <button
                  onClick={() => setShowGridLines(!showGridLines)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showGridLines
                      ? 'bg-[#2563eb]/10 text-[#2563eb]'
                      : 'text-foreground/50 bg-foreground/5'
                  }`}
                >
                  <Grid3x3 className={IC_SM} />
                  Grid
                </button>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground/50 bg-foreground/5 transition-colors"
                >
                  {theme === 'light' ? <Moon className={IC_SM} /> : <Sun className={IC_SM} />}
                  {theme === 'light' ? 'Dark' : 'Light'}
                </button>
                <button
                  onClick={() => { clearCanvas(); setSheetOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-500/10 transition-colors"
                >
                  <Trash2 className={IC_SM} />
                  Clear
                </button>
                <GridSizeSelector />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Fixed bottom bar ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-[100] md:hidden bg-background border-t border-border/60 select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center h-[52px] px-1">
          {/* Tool buttons */}
          {barTools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-[#2563eb]' : 'text-foreground/50 active:text-foreground'
                }`}
              >
                {t.icon}
                <span className="text-[9px] font-medium leading-none">{t.label}</span>
              </button>
            );
          })}

          {/* Separator */}
          <div className="w-px h-7 bg-border/60 mx-0.5 shrink-0" />

          {/* More */}
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg transition-colors ${
              sheetOpen ? 'text-[#2563eb]' : 'text-foreground/50 active:text-foreground'
            }`}
          >
            <MoreHorizontal className={IC} />
            <span className="text-[9px] font-medium leading-none">More</span>
          </button>
        </div>
      </div>
    </>
  );
}
