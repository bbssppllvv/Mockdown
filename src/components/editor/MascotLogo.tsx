'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/hooks/use-editor-store';

/* ─── Face building (always exactly 9 chars wide) ─── */
/*  format:  /ᐠ {eyeL} {mouth} {eyeR}マ              */

const EYES: Record<string, [string, string]> = {
  normal:    ['-', '-'],
  open:      ['•', '•'],
  happy:     ['^', '^'],
  surprised: ['°', '°'],
  love:      ['♥', '♥'],
  sparkle:   ['✦', '✦'],
  sleepy:    ['˘', '˘'],
  wink:      ['^', '-'],
  winkR:     ['-', '^'],
  x:         ['×', '×'],
  big:       ['◉', '◉'],
  lookL:     ['-', '·'],
  lookR:     ['·', '-'],
};

const MOUTHS: Record<string, string> = {
  normal: '˕',
  smile:  'ᴗ',
  kawaii: 'ω',
  tiny:   '·',
  open:   'o',
};

interface Face {
  eyes: string;
  mouth: string;
}

function buildFace({ eyes, mouth }: Face): string {
  const [l, r] = EYES[eyes] ?? EYES.normal;
  const m = MOUTHS[mouth] ?? MOUTHS.normal;
  return `/ᐠ ${l} ${m} ${r}マ`;
}

/* ─── Mood presets ─── */

const MOODS: Record<string, Face> = {
  idle:      { eyes: 'normal',    mouth: 'normal' },
  blink:     { eyes: 'sleepy',    mouth: 'normal' },
  happy:     { eyes: 'happy',     mouth: 'smile' },
  surprised: { eyes: 'surprised', mouth: 'normal' },
  focused:   { eyes: 'open',      mouth: 'tiny' },
  magic:     { eyes: 'sparkle',   mouth: 'kawaii' },
  love:      { eyes: 'love',      mouth: 'smile' },
  wink:      { eyes: 'wink',      mouth: 'smile' },
  winkR:     { eyes: 'winkR',     mouth: 'smile' },
  sleepy:    { eyes: 'sleepy',    mouth: 'normal' },
  asleep:    { eyes: 'normal',    mouth: 'normal' },
  x:         { eyes: 'x',         mouth: 'tiny' },
  lookL:     { eyes: 'lookL',     mouth: 'normal' },
  lookR:     { eyes: 'lookR',     mouth: 'normal' },
  kawaii:    { eyes: 'happy',     mouth: 'kawaii' },
  big:       { eyes: 'big',       mouth: 'open' },
  curious:   { eyes: 'open',      mouth: 'normal' },
  proud:     { eyes: 'happy',     mouth: 'normal' },
};

/* ─── Helpers ─── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─── Tool → reaction ─── */

const TOOL_REACTIONS: Record<string, string[]> = {
  cursor:   ['wink', 'winkR', 'proud'],
  box:      ['focused', 'curious'],
  line:     ['focused', 'curious'],
  arrow:    ['lookR', 'wink'],
  button:   ['happy', 'kawaii'],
  checkbox: ['wink', 'happy'],
  radio:    ['winkR', 'curious'],
  input:    ['focused', 'curious'],
  dropdown: ['surprised', 'curious'],
  eraser:   ['x', 'surprised'],
};

/* ─── Idle animations ─── */

type IdleAnim = { frames: string[]; durations: number[] };

const IDLE_ANIMS: IdleAnim[] = [
  { frames: ['blink', 'idle'],                    durations: [180] },
  { frames: ['blink', 'idle', 'blink', 'idle'],   durations: [150, 250, 150] },
  { frames: ['lookL', 'idle', 'lookR', 'idle'],   durations: [400, 200, 400] },
  { frames: ['curious', 'idle'],                   durations: [500] },
  { frames: ['kawaii', 'idle'],                    durations: [700] },
  { frames: ['proud', 'idle'],                     durations: [500] },
];

const IDLE_WEIGHTS = [5, 3, 2, 1, 1, 1];

function pickWeighted(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

/* ─── Component ─── */

export function MascotLogo() {
  const [flashMood, setFlashMood] = useState<string | null>(null);
  const [idleMood, setIdleMood] = useState<string | null>(null);
  const [isSleepy, setIsSleepy] = useState(false);
  const [isAsleep, setIsAsleep] = useState(false);
  const [suffix, setSuffix] = useState('');
  const [showPaw, setShowPaw] = useState(false);
  const [pawText, setPawText] = useState('♪');

  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const suffixTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pawTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clickTimes = useRef<number[]>([]);
  const lastInteraction = useRef(Date.now());

  const activeTool = useEditorStore((s) => s.activeTool);
  const isDrawing = useEditorStore((s) => s.isDrawing);
  const undoLen = useEditorStore((s) => s.undoStack.length);
  const redoLen = useEditorStore((s) => s.redoStack.length);

  const baseMood = isDrawing
    ? 'focused'
    : activeTool === 'magic'
      ? 'magic'
      : 'idle';

  /* ── Wake up ── */
  const poke = useCallback(() => {
    lastInteraction.current = Date.now();
    if (isSleepy || isAsleep) {
      setIsSleepy(false);
      setIsAsleep(false);
      setSuffix('');
    }
  }, [isSleepy, isAsleep]);

  /* ── Flash mood + optional suffix ── */
  const flash = useCallback((m: string, ms = 800, sfx = '') => {
    poke();
    setFlashMood(m);
    if (sfx) setSuffix(sfx);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlashMood(null);
      if (sfx) {
        suffixTimer.current = setTimeout(() => setSuffix(''), 300);
      }
    }, ms);
  }, [poke]);

  /* ── Idle animation loop ── */
  useEffect(() => {
    let mainTimer: ReturnType<typeof setTimeout>;
    const frameTimers: ReturnType<typeof setTimeout>[] = [];

    const scheduleNext = () => {
      mainTimer = setTimeout(() => {
        if (flashMood || isAsleep) {
          scheduleNext();
          return;
        }
        const anim = IDLE_ANIMS[pickWeighted(IDLE_WEIGHTS)];
        setIdleMood(anim.frames[0]);
        let elapsed = 0;
        for (let i = 0; i < anim.durations.length; i++) {
          elapsed += anim.durations[i];
          const next = anim.frames[i + 1];
          const t = setTimeout(() => {
            setIdleMood(next === 'idle' ? null : next);
          }, elapsed);
          frameTimers.push(t);
        }
        scheduleNext();
      }, 3000 + Math.random() * 3000);
    };

    scheduleNext();
    return () => {
      clearTimeout(mainTimer);
      frameTimers.forEach(clearTimeout);
    };
  }, [flashMood, isAsleep]);

  /* ── Sleep timer ── */
  useEffect(() => {
    const check = () => {
      const idle = Date.now() - lastInteraction.current;
      if (idle > 60_000 && !isAsleep) {
        setIsAsleep(true);
        setIsSleepy(false);
        setSuffix('ᶻ 𝗓 𐰁');
      } else if (idle > 30_000 && !isSleepy && !isAsleep) {
        setIsSleepy(true);
        setSuffix(' ᶻ');
      }
    };
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [isSleepy, isAsleep]);

  /* ── Tool change ── */
  const prevTool = useRef(activeTool);
  useEffect(() => {
    if (prevTool.current === activeTool) return;
    prevTool.current = activeTool;
    poke();
    if (activeTool === 'magic') return;
    const reactions = TOOL_REACTIONS[activeTool] ?? ['wink', 'happy'];
    flash(pick(reactions), 600);
  }, [activeTool, flash, poke]);

  /* ── Drawing end ── */
  const prevDrawing = useRef(isDrawing);
  useEffect(() => {
    if (prevDrawing.current && !isDrawing) {
      flash(pick(['happy', 'proud', 'kawaii']), 600, ' ✧');
    }
    if (!prevDrawing.current && isDrawing) poke();
    prevDrawing.current = isDrawing;
  }, [isDrawing, flash, poke]);

  /* ── Undo / redo ── */
  const prevUndo = useRef(undoLen);
  const prevRedo = useRef(redoLen);
  useEffect(() => {
    const undone = prevUndo.current > undoLen;
    const redone = prevRedo.current > redoLen;
    prevUndo.current = undoLen;
    prevRedo.current = redoLen;
    if (undone) flash(pick(['surprised', 'big']), 500, ' !');
    else if (redone) flash(pick(['wink', 'happy']), 500);
  }, [undoLen, redoLen, flash]);

  /* ── Resolve face ── */
  const face = (): Face => {
    if (isAsleep) return MOODS.asleep;
    if (isSleepy) return MOODS.sleepy;
    if (flashMood) return MOODS[flashMood] ?? MOODS.idle;
    if (idleMood) return MOODS[idleMood] ?? MOODS.idle;
    return MOODS[baseMood] ?? MOODS.idle;
  };

  /* ── Click ── */
  const handleClick = () => {
    if (isAsleep || isSleepy) {
      poke();
      flash('surprised', 800, ' !');
      return;
    }

    const now = Date.now();
    clickTimes.current = clickTimes.current.filter((t) => now - t < 2000);
    clickTimes.current.push(now);
    const clicks = clickTimes.current.length;

    let mood: string;
    let paw: string;
    let sfx: string;
    if (clicks >= 5) {
      mood = 'big';
      paw = '!!';
      sfx = ' !!';
    } else if (clicks >= 3) {
      mood = pick(['love', 'kawaii']);
      paw = pick(['♪', '✧']);
      sfx = pick([' ♥', ' ✧']);
    } else {
      mood = pick([
        'happy', 'love', 'surprised', 'wink', 'winkR',
        'kawaii', 'proud', 'curious',
      ]);
      paw = pick(['♪', '✧', 'ノ']);
      sfx = '';
    }

    flash(mood, 1200, sfx);
    setPawText(paw);
    setShowPaw(true);
    clearTimeout(pawTimer.current);
    pawTimer.current = setTimeout(() => setShowPaw(false), 1200);
  };

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      clearTimeout(flashTimer.current);
      clearTimeout(suffixTimer.current);
      clearTimeout(pawTimer.current);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-start px-4 pt-3 pb-3 border-b border-border/40 cursor-pointer select-none"
      onClick={handleClick}
      title="meow!"
    >
      <span
        className={`text-xl leading-none whitespace-pre transition-opacity duration-300 ${
          isAsleep ? 'text-foreground/40' : 'text-foreground'
        }`}
        aria-label="Cat mascot"
      >
        {buildFace(face())}
        <span className="text-sm text-foreground/40">{suffix}</span>
      </span>
      <span
        className={`text-[10px] text-foreground/30 leading-none overflow-hidden transition-all duration-200 ${
          showPaw ? 'max-h-4 opacity-100 mt-1 ml-1' : 'max-h-0 opacity-0'
        }`}
      >
        {pawText}
      </span>
    </div>
  );
}
