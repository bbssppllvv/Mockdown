'use client';

import { Toolbar } from './Toolbar';
import { Grid } from './Grid';
import { StatusBar } from './StatusBar';
import { useKeyboard } from '@/hooks/use-keyboard';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Editor() {
  useKeyboard();

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Toolbar />
        <div className="flex flex-col flex-1 min-w-0">
          <Grid />
          <StatusBar />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
