```
 ┌──────────────────────────────────────┐
 │                                      │
 │   (•˕ •マ   M O C K D O W N         │
 │                                      │
 │   draw UI. copy text. feed your AI.  │
 │                                      │
 └──────────────────────────────────────┘
```

AI agents read markdown better than they read your mind.

Mockdown is an ascii wireframe editor. Draw a UI, copy it as a markdown code block, paste it into Claude Code or Cursor. The agent gets layout, hierarchy, and structure — no guessing.

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
npm install
npm run dev
```

open `http://localhost:3000`

for the magic tool, add `OPENAI_API_KEY` to `.env.local`.

## stack

next.js · react · zustand · tailwind · html canvas · jetbrains mono

## license

MIT (ᵕ‿ ᵕマ
