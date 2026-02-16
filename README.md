```
 ┌──────────────────────────────────────┐
 │                                      │
 │   (•˕ •マ  ← your new design buddy  │
 │                                      │
 │          M O C K D O W N             │
 │                                      │
 │     ascii wireframe editor           │
 │                                      │
 └──────────────────────────────────────┘
```

draw wireframes with your keyboard. copy as markdown. paste anywhere.

no figma. no drag-and-drop. just you, a grid, and ascii characters.

## what is this (•˕ •マ

mockdown is a browser-based wireframe editor where everything is made of text characters.
draw boxes, lines, arrows, buttons, checkboxes, dropdowns — all in ascii art.
then copy the result as a markdown code block and paste it into docs, issues, PRs, slack, wherever.

```
┌─────────────────────────────┐
│ Username  [_______________] │
│ Password  [_______________] │
│                             │
│ [x] Remember me             │
│                             │
│       [ Sign In ]           │
└─────────────────────────────┘
```

stuff like that. made in seconds.

## features

- **draw** — boxes, lines, arrows with mouse
- **widgets** — buttons `[ OK ]`, checkboxes `[x]`, radio `(o)`, inputs `[____]`, dropdowns `[v]`
- **text mode** — just type anywhere on the grid
- **select & move** — drag stuff around
- **magic tool** — select a region, describe what you want, AI draws it for you (ᵕω ᵕマ
- **undo/redo** — ctrl+z / ctrl+shift+z
- **copy markdown** — one click, ready to paste
- **resizable grid** — small, medium, large, wide, tall
- **a cat** — lives in the sidebar. blinks. sometimes yawns. (•˕ •マ

## the cat

there's an ascii cat in the toolbar. it has its own life:

```
(•˕ •マ       idle, just vibing
(–˕ –マ       blink
(ᵕω ᵕマ      happy
(°o °マ       surprised
(˘˕ ˘マ ᶻ    sleepy...
(–ー –マ ᶻᶻ   asleep
```

click it. it reacts. leave it alone — it falls asleep. it does not care about your wireframes.

## run it

```bash
npm install
npm run dev
```

open `http://localhost:3000`

for the magic tool, set `OPENAI_API_KEY` in `.env.local`.

## stack

next.js, react, zustand, tailwind, html canvas, jetbrains mono

## license

do whatever you want (ᵕ‿ ᵕマ
