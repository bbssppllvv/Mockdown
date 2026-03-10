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
      <div className="flex items-center gap-2 border border-[#2563eb]/20 bg-[#2563eb]/6 px-3 py-1">
        <span className="hidden lg:inline text-foreground/55">
          Try my other product:
        </span>
        <a
          href="https://refero.design/mcp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center bg-[#2563eb] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#1d4ed8]"
          title="Refero MCP helps AI agents research real product screens and user flows before they design."
        >
          Refero MCP
        </a>
        <span className="hidden 2xl:inline text-foreground/45">
          Real product UI research for agents.
        </span>
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
