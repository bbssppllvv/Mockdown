'use client';

import { useEditorStore } from '@/hooks/use-editor-store';
import { toolMap } from '@/components/tools/registry';
import { GridSizeSelector } from './GridSizeSelector';

export function StatusBar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const cursorRow = useEditorStore((s) => s.cursorRow);
  const cursorCol = useEditorStore((s) => s.cursorCol);

  const toolLabel = toolMap[activeTool]?.label ?? activeTool;

  return (
    <div className="hidden md:flex items-center gap-4 px-4 py-1.5 border-t border-border/60 text-xs text-foreground/40 font-mono select-none">
      <span className="uppercase font-bold px-2 py-0.5 rounded-lg text-[10px] tracking-wider bg-[#2563eb] text-white">
        {toolLabel}
      </span>
      <span className="font-medium text-foreground/40">
        Ln {cursorRow + 1}, Col {cursorCol + 1}
      </span>
      <div className="flex-1" />
      <GridSizeSelector />
    </div>
  );
}
