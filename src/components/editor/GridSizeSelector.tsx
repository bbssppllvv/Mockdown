'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useEditorStore } from '@/hooks/use-editor-store';
import { GRID_PRESETS } from '@/lib/constants';
import { useState, useEffect } from 'react';

export function GridSizeSelector() {
  const grid = useEditorStore((s) => s.renderedGrid);
  const resizeGrid = useEditorStore((s) => s.resizeGrid);
  const [customCols, setCustomCols] = useState('');
  const [customRows, setCustomRows] = useState('');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleCustomApply = () => {
    const cols = parseInt(customCols) || grid.cols;
    const rows = parseInt(customRows) || grid.rows;
    if (cols >= 10 && cols <= 300 && rows >= 5 && rows <= 200) {
      resizeGrid(rows, cols);
      setOpen(false);
    }
  };

  if (!mounted) {
    return (
      <button className="text-[10px] font-medium text-foreground/40 select-none">
        {grid.cols}&times;{grid.rows}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-[10px] font-medium text-foreground/40 hover:text-foreground transition-colors select-none">
          {grid.cols}&times;{grid.rows}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end" side="top">
        <div className="text-[10px] font-semibold text-foreground/30 mb-1.5 px-2 uppercase tracking-wider">Grid Size</div>
        {GRID_PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors duration-100 ${
              grid.cols === preset.cols && grid.rows === preset.rows
                ? 'bg-[#2563eb] text-white'
                : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
            }`}
            onClick={() => {
              resizeGrid(preset.rows, preset.cols);
              setOpen(false);
            }}
          >
            {preset.label}
          </button>
        ))}
        <div className="border-t border-border/60 mt-2 pt-2 px-2">
          <div className="text-[10px] font-semibold text-foreground/30 mb-1.5 uppercase tracking-wider">Custom</div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder={String(grid.cols)}
              value={customCols}
              onChange={(e) => setCustomCols(e.target.value)}
              className="w-14 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background"
              min={10}
              max={300}
            />
            <span className="text-xs text-foreground/30">&times;</span>
            <input
              type="number"
              placeholder={String(grid.rows)}
              value={customRows}
              onChange={(e) => setCustomRows(e.target.value)}
              className="w-14 h-7 px-2 text-xs border border-border/60 rounded-lg bg-background"
              min={5}
              max={200}
            />
            <button
              onClick={handleCustomApply}
              className="h-7 px-2.5 text-xs font-medium rounded-lg bg-foreground text-background hover:bg-foreground/80 transition-colors duration-100"
            >
              OK
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
