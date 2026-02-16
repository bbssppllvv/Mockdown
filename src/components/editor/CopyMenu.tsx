'use client';

import { Copy } from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { copyAsMarkdown } from '@/lib/clipboard';
import { toast } from 'sonner';

export function CopyMenu() {
  const grid = useEditorStore((s) => s.grid);

  const handleCopy = async () => {
    await copyAsMarkdown(grid);
    toast.success('Copied as Markdown!');
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-foreground/50 hover:bg-foreground/5 hover:text-foreground transition-colors duration-100 select-none"
    >
      <Copy className="h-4 w-4" />
      Copy
    </button>
  );
}
