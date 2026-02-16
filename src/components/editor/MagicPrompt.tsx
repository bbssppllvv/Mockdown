'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Wand2, Loader2, X } from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { generateMagicContent } from '@/lib/ai';

const EMPTY_SUGGESTIONS = [
  'Sign-in form',
  'Navigation bar',
  'Dashboard with cards',
  'Pricing table',
  'Settings page',
  'Upload dialog',
];

const CONTENT_SUGGESTIONS = [
  'Fix spacing inside boxes',
  'Center text and align labels',
  'Add title',
  'Add labels',
  'Wrap in a box',
  'Redesign from scratch',
];

export function MagicPrompt({ cellWidth, cellHeight }: { cellWidth: number; cellHeight: number }) {
  const magicSelection = useEditorStore((s) => s.magicSelection);
  const magicLoading = useEditorStore((s) => s.magicLoading);
  const setMagicLoading = useEditorStore((s) => s.setMagicLoading);
  const clearMagic = useEditorStore((s) => s.clearMagic);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const applyChars = useEditorStore((s) => s.applyChars);
  const grid = useEditorStore((s) => s.grid);

  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const existingContent = useMemo(() => {
    if (!magicSelection) return '';
    const { minRow, maxRow, minCol, maxCol } = magicSelection;
    const lines: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      let line = '';
      for (let c = minCol; c <= maxCol; c++) {
        line += grid.getChar(r, c);
      }
      lines.push(line);
    }
    return lines.join('\n');
  }, [magicSelection, grid]);

  const hasContent = useMemo(() => existingContent.trim().length > 0, [existingContent]);
  const suggestions = hasContent ? CONTENT_SUGGESTIONS : EMPTY_SUGGESTIONS;

  useEffect(() => {
    if (magicSelection && inputRef.current) {
      inputRef.current.focus();
      setPrompt('');
      setError('');
    }
  }, [magicSelection]);

  if (!magicSelection) return null;

  const { minRow, maxRow, minCol, maxCol } = magicSelection;
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;

  const top = (maxRow + 1) * cellHeight + 4;
  const left = minCol * cellWidth;

  const handleSubmit = async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt ?? prompt;
    if (!finalPrompt.trim()) return;

    setError('');
    setMagicLoading(true);

    try {
      const result = await generateMagicContent(
        finalPrompt,
        width,
        height,
        hasContent ? existingContent : undefined
      );

      const lines = result.split('\n');
      pushUndo();

      const chars: { row: number; col: number; char: string }[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          chars.push({ row: r, col: c, char: ' ' });
        }
      }
      for (let i = 0; i < lines.length && i < height; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length && j < width; j++) {
          chars.push({ row: minRow + i, col: minCol + j, char: line[j] });
        }
      }

      applyChars(chars);
      clearMagic();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      clearMagic();
    }
  };

  return (
    <div
      className="absolute z-20"
      style={{ top, left }}
    >
      <div className="w-60 bg-background border border-border/60 rounded-lg shadow-xl p-2.5 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2563eb]">
            <Wand2 className="h-3.5 w-3.5" />
            Magic {width}&times;{height}
          </div>
          <button
            onClick={clearMagic}
            className="p-0.5 rounded-lg text-foreground/30 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Prompt input */}
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            placeholder={hasContent ? 'Describe changes...' : 'Describe UI...'}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={magicLoading}
            className="flex-1 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background text-foreground placeholder:text-foreground/30 disabled:opacity-50"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={magicLoading || !prompt.trim()}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#2563eb] text-white hover:bg-[#2563eb]/90 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {magicLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Suggestions — vertical stack */}
        {!magicLoading && (
          <div className="flex flex-col gap-0.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setPrompt(s); handleSubmit(s); }}
                className="w-full text-left px-2 py-1 rounded-lg text-xs text-foreground/40 hover:bg-foreground/5 hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {magicLoading && (
          <div className="flex items-center gap-2 px-1 text-xs text-foreground/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563eb]" />
            Generating...
          </div>
        )}

        {error && <div className="text-xs text-red-500 px-1">{error}</div>}
      </div>
    </div>
  );
}
