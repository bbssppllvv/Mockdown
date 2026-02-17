'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Wand2, Loader2, X } from 'lucide-react';
import { useEditorStore } from '@/hooks/use-editor-store';
import { streamGenerateContent, postProcessGenerate } from '@/lib/ai';

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

export function GeneratePrompt() {
  const generateSelection = useEditorStore((s) => s.generateSelection);
  const generateLoading = useEditorStore((s) => s.generateLoading);
  const setGenerateLoading = useEditorStore((s) => s.setGenerateLoading);
  const clearGenerate = useEditorStore((s) => s.clearGenerate);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const applyChars = useEditorStore((s) => s.applyChars);
  const setCharsRaw = useEditorStore((s) => s.setCharsRaw);
  const grid = useEditorStore((s) => s.renderedGrid);

  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const existingContent = useMemo(() => {
    if (!generateSelection) return '';
    const { minRow, maxRow, minCol, maxCol } = generateSelection;
    const lines: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      let line = '';
      for (let c = minCol; c <= maxCol; c++) {
        line += grid.getChar(r, c);
      }
      lines.push(line);
    }
    return lines.join('\n');
  }, [generateSelection, grid]);

  const hasContent = useMemo(() => existingContent.trim().length > 0, [existingContent]);
  const suggestions = hasContent ? CONTENT_SUGGESTIONS : EMPTY_SUGGESTIONS;

  useEffect(() => {
    if (generateSelection && inputRef.current) {
      inputRef.current.focus();
      setPrompt('');
      setError('');
    }
  }, [generateSelection]);

  if (!generateSelection) return null;

  const { minRow, maxRow, minCol, maxCol } = generateSelection;
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;

  const handleSubmit = async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt ?? prompt;
    if (!finalPrompt.trim() || generateLoading) return;

    setError('');
    setGenerateLoading(true);
    pushUndo();

    // Clear selection area
    const clearChars: { row: number; col: number; char: string }[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        clearChars.push({ row: r, col: c, char: ' ' });
      }
    }
    setCharsRaw(clearChars);

    abortRef.current = new AbortController();

    try {
      const fullText = await streamGenerateContent(
        finalPrompt,
        width,
        height,
        (lineIndex, fittedLine) => {
          // Progressive rendering: write each line without junction resolution
          const lineChars: { row: number; col: number; char: string }[] = [];
          for (let j = 0; j < fittedLine.length && j < width; j++) {
            lineChars.push({ row: minRow + lineIndex, col: minCol + j, char: fittedLine[j] });
          }
          setCharsRaw(lineChars);
        },
        hasContent ? existingContent : undefined,
        abortRef.current.signal,
      );

      // Final pass: post-process full text and apply with junction resolution
      const lines = postProcessGenerate(fullText, width, height);
      const finalChars: { row: number; col: number; char: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length && j < width; j++) {
          finalChars.push({ row: minRow + i, col: minCol + j, char: lines[i][j] });
        }
      }
      applyChars(finalChars);
      clearGenerate();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerateLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      abortRef.current?.abort();
      clearGenerate();
    }
  };

  return (
    <div className="fixed z-50 inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-[calc(100vw-32px)] max-w-60 bg-background border border-border/60 rounded-lg shadow-xl p-2.5 flex flex-col gap-2 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2563eb]">
            <Wand2 className="h-3.5 w-3.5" />
            Generate {width}&times;{height}
          </div>
          <button
            onClick={() => { abortRef.current?.abort(); clearGenerate(); }}
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
            disabled={generateLoading}
            className="flex-1 h-8 px-2 text-[16px] md:text-xs border border-border/60 rounded-lg bg-background text-foreground placeholder:text-foreground/30 disabled:opacity-50"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={generateLoading || !prompt.trim()}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-[#2563eb] text-white hover:bg-[#2563eb]/90 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {generateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Suggestions — vertical stack */}
        {!generateLoading && (
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
        {generateLoading && (
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
