```
 ┌──────────────────────────────────────┐
 │                                      │
 │   (•˕ •マ   s k e t c h 2 m d       │
 │                                      │
 │   draw UI. copy markdown. ship to AI.│
 │                                      │
 └──────────────────────────────────────┘
```

AI agents read markdown better than they read your mind.

sketch2md is an ascii wireframe editor. Draw a UI, copy it as a markdown code block, paste it into Claude Code, Codex, or Cursor. The agent gets layout, hierarchy, and structure — no guessing.

It is the sketch sibling of [doc2md](https://github.com/KjellKod/doc2md): doc2md turns existing documents into markdown for agents, sketch2md turns your hand-drawn UI ideas into the same.

## why

You describe a settings page in words. The agent builds... something.

> "sidebar on the left, form on the right, some toggles,
> a save button at the bottom, oh and a header..."

Three rounds of "no, not like that" later, you're still not there.

**One ascii sketch replaces the whole conversation:**

```
┌──────────────────────────────────────────────────┐
│  Settings                              [ Save ]  │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Profile   │  Display Name  [_______________]    │
│  Security  │  Email         [_______________]    │
│  Billing   │                                     │
│  API       │  Bio                                │
│            │  ┌─────────────────────────────┐    │
│            │  │                             │    │
│            │  └─────────────────────────────┘    │
│            │                                     │
│            │  [x] Public profile                 │
│            │  [ ] Show email                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

Paste this into Claude Code → working page. First try.

## more examples

```
┌──────────────────────────────────────────────┐
│  Dashboard                                   │
├──────────────┬──────────────┬────────────────┤
│  Users       │  Revenue     │  Orders        │
│  12,847      │  $48,290     │  1,043         │
│  +12%        │  +8.3%       │  -2.1%         │
├──────────────┴──────────────┴────────────────┤
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  ~ chart area ~                      │    │
│  │                                      │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

```
┌───────────────────────────────┐
│         Create Account        │
│                               │
│  Name      [_______________]  │
│  Email     [_______________]  │
│  Password  [_______________]  │
│                               │
│  (o) Personal   ( ) Business  │
│                               │
│  [x] I agree to the terms     │
│                               │
│      [ Create Account ]       │
│                               │
│  Already have an account?     │
│  Log in                       │
└───────────────────────────────┘
```

## how it works

1. draw with tools — boxes, lines, arrows, text, widgets
2. click **Copy Markdown**
3. paste into your agent's prompt

## features

- **draw** — boxes, lines, arrows
- **widgets** — buttons `[ OK ]`, checkboxes `[x]`, radio `(o)`, inputs `[____]`, dropdowns `[v]`
- **text** — type anywhere
- **select & move**
- **magic tool** — select a region, describe what you want, AI fills it in
- **copy markdown** — one click, ready for your agent
- **undo/redo** — ctrl+z / ctrl+shift+z

## run locally

```bash
npm ci
npm run dev
```

open `http://localhost:3000`

for the magic tool, add `OPENROUTER_API_KEY` to `.env.local`.

## stack

next.js · react · zustand · tailwind · html canvas · local monospace stack

## origins

sketch2md is a friendly fork of [Mockdown](https://github.com/bbssppllvv/Mockdown) by [@bbssppllvv](https://github.com/bbssppllvv), who got the design and the core editor a long way down the field. Big credit for the original idea, the scene-graph architecture, and the kaomoji.

This fork takes its own spin:

- **putting it under test** — the upstream ships with no tests; the editor's hit-testing, resize math, scene-graph mutations, and undo/redo deserve coverage before they get extended
- **UX polish** — fixing the rough edges that make the editor frustrating to use in practice (select/drag glitches, keyboard-shortcut conflicts, properties panel quirks)
- **alignment with the doc2md product family** — same target user, same "structured text for agents" philosophy

Upstream PRs welcome back if @bbssppllvv resurfaces. Until then, the fork is the one that's moving.

## license

MIT — see [LICENSE](./LICENSE). Original copyright (c) 2026 bbssppllvv. Fork copyright (c) 2026 Kjell Hedström. (ᵕ‿ ᵕマ
