'use client';

import { useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { Grid } from './Grid';
import { StatusBar } from './StatusBar';
import { useKeyboard } from '@/hooks/use-keyboard';
import { useEditorStore } from '@/hooks/use-editor-store';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Editor() {
  useKeyboard();
  const theme = useEditorStore((s) => s.theme);
  const toggleTheme = useEditorStore((s) => s.toggleTheme);

  // Hydrate theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ascii-editor-theme');
      if (saved === 'dark') toggleTheme();
    } catch {}
  }, []);

  // Sync .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
