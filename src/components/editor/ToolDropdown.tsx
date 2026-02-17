'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEditorStore } from '@/hooks/use-editor-store';
import { ToolId } from '@/lib/constants';

export interface ToolEntry {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
}

interface ToolDropdownProps {
  label: string;
  defaultIcon: React.ReactNode;
  tools: ToolEntry[];
  side?: 'bottom' | 'right';
}

export function ToolDropdown({ label, defaultIcon, tools, side = 'bottom' }: ToolDropdownProps) {
  const [open, setOpen] = useState(false);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const activeTEntry = tools.find((t) => t.id === activeTool);
  const isGroupActive = !!activeTEntry;
  const compact = side === 'right';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={`flex items-center rounded-lg text-xs font-medium transition-colors duration-100 ${
                compact ? 'justify-center h-8 w-8' : 'gap-1 h-8 px-2'
              } ${
                isGroupActive
                  ? 'bg-[#2563eb]/10 text-[#2563eb]'
                  : 'text-foreground/50 hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              <span className="h-4 w-4 flex items-center justify-center">
                {activeTEntry ? activeTEntry.icon : defaultIcon}
              </span>
              {!compact && (
                <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side={side} className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side={side}
        align="start"
        sideOffset={6}
        className="w-48 p-1.5"
      >
        <div className="flex flex-col gap-0.5">
          {tools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  setOpen(false);
                }}
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
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
