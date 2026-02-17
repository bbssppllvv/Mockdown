'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Menu } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 3.4: Swipe-to-close sidebar detection
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleSidebarPointerDown = useCallback((e: React.PointerEvent) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleSidebarPointerUp = useCallback((e: React.PointerEvent) => {
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.clientY - swipeStartRef.current.y);
    // Left swipe > 60px with more horizontal than vertical movement
    if (dx < -60 && dy < Math.abs(dx)) {
      setSidebarOpen(false);
    }
    swipeStartRef.current = null;
  }, []);

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
        {/* Mobile hamburger button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-background border border-border/60 shadow-sm md:hidden"
          aria-label="Open toolbar"
        >
          <Menu className="h-5 w-5 text-foreground/70" />
        </button>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar: always visible on md+, toggleable overlay on mobile */}
        <div
          ref={sidebarRef}
          className={`
          fixed inset-y-0 left-0 z-50 h-full transition-transform duration-200 ease-out md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
          onPointerDown={handleSidebarPointerDown}
          onPointerUp={handleSidebarPointerUp}
        >
          <Toolbar onToolSelect={() => setSidebarOpen(false)} />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <Grid />
          <StatusBar />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
