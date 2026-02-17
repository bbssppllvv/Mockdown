'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/hooks/use-editor-store';

/* ─── Cat face building blocks ─── */

const EYES: Record<string, [string, string]> = {
  normal:    ['•', '•'],
  blink:     ['–', '–'],
  happy:     ['ᵕ', 'ᵕ'],
  surprised: ['°', '°'],
  wink:      ['^', '–'],
  winkR:     ['–', '^'],
  sparkle:   ['✦', '✦'],
  love:      ['♥', '♥'],
  x:         ['×', '×'],
  big:       ['◉', '◉'],
  sleepy:    ['˘', '˘'],
  lookL:     ['•', '·'],
  lookR:     ['·', '•'],
  star:      ['★', '★'],
  squint:    ['>', '<'],
};

const MOUTHS: Record<string, string> = {
  normal: '˕',
  happy:  'ω',
  smile:  '‿',
  tiny:   '·',
  open:   'o',
  blep:   'з',
  cat:    '3',
  flat:   'ー',
};

interface CatFace {
  eyes: string;
  mouth: string;
}

function buildFace({ eyes, mouth }: CatFace): string {
  const [l, r] = EYES[eyes] ?? EYES.normal;
  const m = MOUTHS[mouth] ?? MOUTHS.normal;
  return `(${l}${m} ${r}マ`;
}

/* ─── Mood presets ─── */

const MOODS: Record<string, CatFace> = {
  idle:        { eyes: 'normal',    mouth: 'normal' },
  blink:       { eyes: 'blink',     mouth: 'normal' },
  happy:       { eyes: 'happy',     mouth: 'happy' },
  surprised:   { eyes: 'surprised', mouth: 'open' },
  focused:     { eyes: 'squint',    mouth: 'tiny' },
  magic:       { eyes: 'sparkle',   mouth: 'happy' },
  love:        { eyes: 'love',      mouth: 'happy' },
  wink:        { eyes: 'wink',      mouth: 'smile' },
  winkR:       { eyes: 'winkR',     mouth: 'smile' },
  big:         { eyes: 'big',       mouth: 'normal' },
  sleepy:      { eyes: 'sleepy',    mouth: 'normal' },
  asleep:      { eyes: 'blink',     mouth: 'flat' },
  lookL:       { eyes: 'lookL',     mouth: 'normal' },
  lookR:       { eyes: 'lookR',     mouth: 'normal' },
  blep:        { eyes: 'normal',    mouth: 'blep' },
  proud:       { eyes: 'happy',     mouth: 'cat' },
  mischievous: { eyes: 'squint',    mouth: 'cat' },
  yawn:        { eyes: 'sleepy',    mouth: 'open' },
  star:        { eyes: 'star',      mouth: 'happy' },
  curious:     { eyes: 'big',       mouth: 'tiny' },
  smug:        { eyes: 'happy',     mouth: 'smile' },
};

/* ─── Helpers ─── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(pct: number): boolean {
  return Math.random() < pct;
}

/* ─── "Living" idle animation sequences ─── */
/*
  The cat lives its own life: blinks, looks around, yawns,
  stretches, sticks out tongue, gets curious, naps a bit…
  Reactions to the user are rare and subtle.
*/

type IdleAnim = { frames: string[]; durations: number[] };

const IDLE_ANIMS: IdleAnim[] = [
  /* ── blinks ── */
  { frames: ['blink', 'idle'],                                        durations: [150] },
  { frames: ['blink', 'idle', 'blink', 'idle'],                       durations: [120, 250, 120] },
  { frames: ['sleepy', 'blink', 'idle'],                               durations: [300, 200] },

  /* ── looking around ── */
  { frames: ['lookR', 'idle'],                                         durations: [600] },
  { frames: ['lookL', 'idle'],                                         durations: [600] },
  { frames: ['lookL', 'idle', 'lookR', 'idle'],                        durations: [400, 200, 400] },
  { frames: ['curious', 'lookR', 'idle'],                              durations: [300, 500] },
  { frames: ['lookR', 'blink', 'lookL', 'idle'],                       durations: [300, 150, 400] },

  /* ── cute moods ── */
  { frames: ['blep', 'idle'],                                          durations: [900] },
  { frames: ['smug', 'idle'],                                          durations: [800] },
  { frames: ['happy', 'idle'],                                         durations: [700] },
  { frames: ['mischievous', 'idle'],                                   durations: [700] },
  { frames: ['love', 'happy', 'idle'],                                 durations: [500, 400] },
  { frames: ['wink', 'idle'],                                          durations: [500] },
  { frames: ['winkR', 'idle'],                                         durations: [500] },
  { frames: ['happy', 'blink', 'happy', 'idle'],                       durations: [400, 150, 400] },
  { frames: ['blep', 'happy', 'idle'],                                 durations: [600, 400] },

  /* ── cat being a cat ── */
  { frames: ['focused', 'happy', 'idle'],                              durations: [400, 500] },
  { frames: ['curious', 'big', 'idle'],                                durations: [200, 500] },
  { frames: ['proud', 'smug', 'idle'],                                 durations: [500, 500] },
  { frames: ['blink', 'idle', 'blink', 'idle', 'blink', 'idle'],      durations: [100, 150, 100, 150, 100] },
  { frames: ['curious', 'blink', 'curious', 'happy', 'idle'],          durations: [300, 150, 300, 400] },
  { frames: ['surprised', 'lookR', 'idle'],                             durations: [300, 500] },
  { frames: ['star', 'happy', 'idle'],                                  durations: [500, 400] },
  { frames: ['mischievous', 'blep', 'idle'],                            durations: [400, 600] },
];

const IDLE_WEIGHTS = [
  10, 6, 3,                                   // blinks (dominant)
  0.5, 0.5, 0.3, 0.3, 0.3,                   // looking
  0.3, 0.3, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, // cute moods
  0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1,   // cat being a cat
];

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

export function CatLogo({ compact }: { compact?: boolean } = {}) {
  const [flashMood, setFlashMood] = useState<string | null>(null);
  const [idleMood, setIdleMood] = useState<string | null>(null);
  const [isSleepy, setIsSleepy] = useState(false);
  const [isAsleep, setIsAsleep] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clickTimes = useRef<number[]>([]);
  const lastInteraction = useRef(Date.now());

  const isDrawing = useEditorStore((s) => s.isDrawing);
  const activeTool = useEditorStore((s) => s.activeTool);

  /* base mood — only for generate tool (sparkly eyes) */
  const baseMood = activeTool === 'generate' ? 'magic' : 'idle';

  /* ── Mark interaction (resets sleep) ── */
  const poke = useCallback(() => {
    lastInteraction.current = Date.now();
    if (isSleepy || isAsleep) {
      setIsSleepy(false);
      setIsAsleep(false);
    }
  }, [isSleepy, isAsleep]);

  /* ── Flash a mood temporarily ── */
  const flash = useCallback((m: string, ms = 800) => {
    poke();
    setFlashMood(m);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashMood(null), ms);
  }, [poke]);

  /* ── Idle animation loop (the cat's "life") ── */
  useEffect(() => {
    let mainTimer: ReturnType<typeof setTimeout>;
    const frameTimers: ReturnType<typeof setTimeout>[] = [];

    const scheduleNext = () => {
      const pause = 3000 + Math.random() * 4000;
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
      }, pause);
    };

    scheduleNext();
    return () => {
      clearTimeout(mainTimer);
      frameTimers.forEach(clearTimeout);
    };
  }, [flashMood, isAsleep]);

  /* ── Sleepy / asleep after inactivity ── */
  useEffect(() => {
    const check = () => {
      const idle = Date.now() - lastInteraction.current;
      if (idle > 60_000 && !isAsleep) {
        setIsAsleep(true);
        setIsSleepy(false);
      } else if (idle > 30_000 && !isSleepy && !isAsleep) {
        setIsSleepy(true);
      }
    };
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [isSleepy, isAsleep]);

  /* ── Subtle reaction to finishing a drawing (not every time) ── */
  const prevDrawing = useRef(isDrawing);
  useEffect(() => {
    if (prevDrawing.current && !isDrawing) {
      poke();
      /* only react ~30% of the time */
      if (chance(0.3)) {
        flash(pick(['happy', 'smug', 'proud']), 700);
      }
    }
    prevDrawing.current = isDrawing;
  }, [isDrawing, flash, poke]);

  /* ── Resolve which face to show ── */
  const face = (): CatFace => {
    if (isAsleep) return MOODS.asleep;
    if (isSleepy) return MOODS.sleepy;
    if (flashMood) return MOODS[flashMood] ?? MOODS.idle;
    if (idleMood) return MOODS[idleMood] ?? MOODS.idle;
    return MOODS[baseMood] ?? MOODS.idle;
  };

  /* ── Click on the cat ── */
  const handleClick = () => {
    if (isAsleep || isSleepy) {
      poke();
      flash('surprised', 800);
      return;
    }

    const now = Date.now();
    clickTimes.current = clickTimes.current.filter((t) => now - t < 2000);
    clickTimes.current.push(now);
    const clicks = clickTimes.current.length;

    let mood: string;
    if (clicks >= 5) {
      mood = pick(['love', 'star']);
    } else if (clicks >= 3) {
      mood = pick(['happy', 'love']);
    } else {
      mood = pick(['happy', 'wink', 'winkR', 'smug', 'blep']);
    }

    flash(mood, 1000);
  };

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      clearTimeout(flashTimer.current);
    };
  }, []);

  const sleepLabel = isAsleep ? ' ᶻᶻ' : isSleepy ? ' ᶻ' : '';
  const faceStr = buildFace(face());

  return (
    <div
      className={`cursor-pointer select-none ${
        compact ? 'py-1 overflow-hidden' : 'flex flex-col items-start px-4 pt-5 pb-5'
      }`}
      onClick={handleClick}
      title="meow!"
    >
      <span
        className={`leading-none whitespace-nowrap transition-opacity duration-500 ${
          compact ? 'text-sm' : 'text-3xl'
        } ${isAsleep ? 'text-foreground/40' : 'text-foreground'}`}
        aria-label="Cat logo"
      >
        <span
          key={faceStr}
          className="inline-block animate-face-swap"
          style={{ transform: 'scaleX(-1)', width: '6ch' }}
        >
          {faceStr}
        </span>
        {!compact && sleepLabel}
      </span>
    </div>
  );
}
