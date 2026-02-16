'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditorStore } from '@/hooks/use-editor-store';

/* ─── Robot face building blocks ─── */

const EYES: Record<string, [string, string]> = {
  normal:    ['•', '•'],
  blink:     ['–', '–'],
  happy:     ['^', '^'],
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
  tiny:      ['·', '·'],
  squint:    ['>', '<'],
  dizzy:     ['@', '@'],
  dollar:    ['$', '$'],
  plus:      ['+', '+'],
};

const MOUTHS: Record<string, string> = {
  normal:  '_',
  smile:   '‿',
  open:    '□',
  kawaii:  'ω',
  tiny:    '·',
  flat:    'ー',
  tri:     '△',
  wave:    '~',
};

interface RobotFace {
  eyes: string;
  mouth: string;
}

function buildFace({ eyes, mouth }: RobotFace): string {
  const [l, r] = EYES[eyes] ?? EYES.normal;
  const m = MOUTHS[mouth] ?? MOUTHS.normal;
  return `⌐[${l}${m}${r}]`;
}

/* ─── Mood presets ─── */

const MOODS: Record<string, RobotFace> = {
  idle:        { eyes: 'normal',    mouth: 'normal' },
  blink:       { eyes: 'blink',     mouth: 'normal' },
  happy:       { eyes: 'happy',     mouth: 'smile' },
  surprised:   { eyes: 'surprised', mouth: 'open' },
  focused:     { eyes: 'squint',    mouth: 'tiny' },
  magic:       { eyes: 'sparkle',   mouth: 'kawaii' },
  love:        { eyes: 'love',      mouth: 'smile' },
  wink:        { eyes: 'wink',      mouth: 'smile' },
  winkR:       { eyes: 'winkR',     mouth: 'smile' },
  big:         { eyes: 'big',       mouth: 'open' },
  sleepy:      { eyes: 'sleepy',    mouth: 'normal' },
  asleep:      { eyes: 'blink',     mouth: 'flat' },
  error:       { eyes: 'x',         mouth: 'open' },
  lookL:       { eyes: 'lookL',     mouth: 'normal' },
  lookR:       { eyes: 'lookR',     mouth: 'normal' },
  kawaii:      { eyes: 'happy',     mouth: 'kawaii' },
  proud:       { eyes: 'happy',     mouth: 'tri' },
  computing:   { eyes: 'plus',      mouth: 'tiny' },
  scared:      { eyes: 'big',       mouth: 'open' },
  dizzy:       { eyes: 'dizzy',     mouth: 'wave' },
  boot:        { eyes: 'tiny',      mouth: 'tiny' },
  star:        { eyes: 'star',      mouth: 'kawaii' },
  curious:     { eyes: 'big',       mouth: 'tiny' },
  smug:        { eyes: 'happy',     mouth: 'normal' },
  confused:    { eyes: 'surprised', mouth: 'wave' },
  dollar:      { eyes: 'dollar',    mouth: 'smile' },
};

/* ─── Helpers ─── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─── Tool → reaction mapping ─── */

const TOOL_REACTIONS: Record<string, string[]> = {
  cursor:   ['wink', 'winkR', 'smug'],
  box:      ['focused', 'computing'],
  line:     ['focused', 'curious'],
  arrow:    ['lookR', 'wink'],
  button:   ['happy', 'kawaii'],
  checkbox: ['wink', 'happy'],
  radio:    ['winkR', 'curious'],
  input:    ['focused', 'computing'],
  dropdown: ['surprised', 'curious'],
  eraser:   ['error', 'scared'],
};

/* ─── Idle animation sequences ─── */

type IdleAnim = { frames: string[]; durations: number[] };

const IDLE_ANIMS: IdleAnim[] = [
  // simple blink
  { frames: ['blink', 'idle'],                      durations: [150] },
  // double blink
  { frames: ['blink', 'idle', 'blink', 'idle'],     durations: [120, 200, 120] },
  // scan left → right
  { frames: ['lookL', 'idle', 'lookR', 'idle'],     durations: [350, 150, 350] },
  // kawaii moment
  { frames: ['kawaii', 'idle'],                      durations: [700] },
  // boot sequence
  { frames: ['boot', 'blink', 'idle'],              durations: [300, 150] },
  // curious peek
  { frames: ['curious', 'idle'],                     durations: [500] },
  // proud beep
  { frames: ['proud', 'idle'],                       durations: [500] },
  // computing
  { frames: ['computing', 'focused', 'idle'],        durations: [300, 300] },
];

/* weights: blink is most common */
const IDLE_WEIGHTS = [5, 3, 2, 1, 1, 1, 1, 1];

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

export function RobotLogo() {
  const [flashMood, setFlashMood] = useState<string | null>(null);
  const [idleMood, setIdleMood] = useState<string | null>(null);
  const [isSleepy, setIsSleepy] = useState(false);
  const [isAsleep, setIsAsleep] = useState(false);
  const [showHand, setShowHand] = useState(false);
  const [handText, setHandText] = useState('ノ');

  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const clickTimes = useRef<number[]>([]);
  const lastInteraction = useRef(Date.now());

  const activeTool = useEditorStore((s) => s.activeTool);
  const isDrawing = useEditorStore((s) => s.isDrawing);
  const undoLen = useEditorStore((s) => s.undoStack.length);
  const redoLen = useEditorStore((s) => s.redoStack.length);

  /* base mood from editor state */
  const baseMood = isDrawing
    ? 'focused'
    : activeTool === 'magic'
      ? 'magic'
      : 'idle';

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

        const animIdx = pickWeighted(IDLE_WEIGHTS);
        const anim = IDLE_ANIMS[animIdx];

        setIdleMood(anim.frames[0]);
        let elapsed = 0;
        for (let i = 0; i < anim.durations.length; i++) {
          elapsed += anim.durations[i];
          const nextFrame = anim.frames[i + 1];
          const t = setTimeout(() => {
            setIdleMood(nextFrame === 'idle' ? null : nextFrame);
          }, elapsed);
          frameTimers.push(t);
        }

        scheduleNext();
      }, 2500 + Math.random() * 3500);
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

  /* ── React to tool change ── */
  const prevTool = useRef(activeTool);
  useEffect(() => {
    if (prevTool.current === activeTool) return;
    prevTool.current = activeTool;
    poke();
    if (activeTool === 'magic') return;
    const reactions = TOOL_REACTIONS[activeTool] ?? ['wink', 'happy'];
    flash(pick(reactions), 600);
  }, [activeTool, flash, poke]);

  /* ── React to drawing end ── */
  const prevDrawing = useRef(isDrawing);
  useEffect(() => {
    if (prevDrawing.current && !isDrawing) {
      flash(pick(['happy', 'proud', 'kawaii']), 600);
    }
    if (!prevDrawing.current && isDrawing) poke();
    prevDrawing.current = isDrawing;
  }, [isDrawing, flash, poke]);

  /* ── React to undo / redo ── */
  const prevUndo = useRef(undoLen);
  const prevRedo = useRef(redoLen);
  useEffect(() => {
    const undone = prevUndo.current > undoLen;
    const redone = prevRedo.current > redoLen;
    prevUndo.current = undoLen;
    prevRedo.current = redoLen;
    if (undone) flash(pick(['surprised', 'confused', 'scared']), 500);
    else if (redone) flash(pick(['wink', 'happy', 'proud']), 500);
  }, [undoLen, redoLen, flash]);

  /* ── Resolve which face to show ── */
  const face = (): RobotFace => {
    if (isAsleep) return MOODS.asleep;
    if (isSleepy) return MOODS.sleepy;
    if (flashMood) return MOODS[flashMood] ?? MOODS.idle;
    if (idleMood) return MOODS[idleMood] ?? MOODS.idle;
    return MOODS[baseMood] ?? MOODS.idle;
  };

  /* ── Click on the robot ── */
  const handleClick = () => {
    if (isAsleep || isSleepy) {
      poke();
      flash('boot', 600);
      setHandText('⌁');
      setShowHand(true);
      clearTimeout(handTimer.current);
      handTimer.current = setTimeout(() => setShowHand(false), 800);
      return;
    }

    const now = Date.now();
    clickTimes.current = clickTimes.current.filter((t) => now - t < 2000);
    clickTimes.current.push(now);
    const clicks = clickTimes.current.length;

    let mood: string;
    let hand: string;
    if (clicks >= 5) {
      mood = 'dizzy';
      hand = '!!';
    } else if (clicks >= 3) {
      mood = pick(['star', 'love', 'dizzy', 'dollar']);
      hand = pick(['⚡', '♪']);
    } else {
      mood = pick([
        'happy', 'love', 'surprised', 'big', 'wink', 'winkR',
        'kawaii', 'proud', 'star', 'computing',
      ]);
      hand = pick(['ノ', '⚡', '♪', '✓']);
    }

    flash(mood, 1200);
    setHandText(hand);
    setShowHand(true);
    clearTimeout(handTimer.current);
    handTimer.current = setTimeout(() => setShowHand(false), 1200);
  };

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      clearTimeout(flashTimer.current);
      clearTimeout(handTimer.current);
    };
  }, []);

  const sleepLabel = isAsleep ? ' ᶻᶻ' : isSleepy ? ' ᶻ' : '';

  return (
    <div
      className="flex flex-col items-start px-4 pt-3 pb-3 border-b border-border/40 cursor-pointer select-none"
      onClick={handleClick}
      title="beep boop!"
    >
      <span
        className={`text-2xl leading-none transition-opacity duration-300 ${
          isAsleep ? 'text-foreground/40' : 'text-foreground'
        }`}
        aria-label="Robot logo"
      >
        {buildFace(face())}{sleepLabel}
      </span>
      <span
        className={`text-[10px] text-foreground/30 leading-none overflow-hidden transition-all duration-200 ${
          showHand ? 'max-h-4 opacity-100 mt-1 ml-2' : 'max-h-0 opacity-0'
        }`}
      >
        {handText}
      </span>
    </div>
  );
}
