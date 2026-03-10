'use client';

import Link from 'next/link';
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
      <div className="flex items-center gap-2 border-l border-border/60 pl-4">
        <span className="hidden xl:inline text-foreground/35">
          Real product UI research for agents.
        </span>
        <a
          href="https://refero.design/mcp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center border border-border/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/55 transition-colors hover:border-[#2563eb] hover:bg-[#2563eb] hover:text-white"
          title="Refero MCP connects agents to curated real product screens and user flows."
        >
          Refero MCP
        </a>
      </div>
      <Link href="/about" className="hover:text-foreground/60 transition-colors">
        About
      </Link>
      <a
        href="https://x.com/bbssppllvv"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground/60 transition-colors"
      >
        @bbssppllvv
      </a>
    </div>
  );
}
