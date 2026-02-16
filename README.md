```
 ┌──────────────────────────────────────┐
 │                                      │
 │   (•˕ •マ   M O C K D O W N         │
 │                                      │
 │   ascii wireframes for AI agents     │
 │                                      │
 └──────────────────────────────────────┘
```

## the problem

you're working with an AI coding agent — Claude Code, Cursor, Copilot, whatever.
you need a UI built. you start typing:

> "make a settings page with a sidebar on the left, and then like a form on the right,
> with some toggles, and a save button at the bottom, oh and a header..."

the agent tries its best. the result is... not what you meant.

## the fix

**draw it.** mockdown lets you sketch a wireframe in ascii characters and copy it as markdown. paste it straight into your agent's prompt. done.

AI agents understand text and markdown natively. a simple ascii drawing tells them more about layout, hierarchy, and structure than a paragraph of words ever could.

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

paste this into Claude Code → get a working page. no ambiguity, no "that's not what I meant".

## more examples

**dashboard with stats cards:**
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

**signup flow:**
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

**mobile nav:**
```
┌─────────────────────┐
│ ☰  App Name   (o)   │
├─────────────────────┤
│                     │
│  content here       │
│                     │
├──────┬──────┬───────┤
│ Home │ Feed │ Inbox │
└──────┴──────┴───────┘
```

## how it works

1. open mockdown in your browser
2. draw with tools — boxes, lines, arrows, text, widgets
3. click **Copy Markdown** — your wireframe is now a markdown code block
4. paste it into your AI agent's chat
5. the agent builds exactly what you drew

## features

- **draw** — boxes, lines, arrows with mouse
- **widgets** — buttons `[ OK ]`, checkboxes `[x]`, radio `(o)`, inputs `[____]`, dropdowns `[v]`
- **text mode** — type anywhere on the grid
- **select & move** — drag stuff around
- **magic tool** — select a region, describe what you want, AI fills it in
- **copy markdown** — one click, ready to paste into any agent
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

MIT — do whatever you want (ᵕ‿ ᵕマ
