import { NextRequest, NextResponse } from 'next/server';
import { streamText, streamObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { wireframeNodeSchema } from '@/lib/scene/ai-schema';

// ─── Rate limiter (in-memory, per IP) ──────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;           // max requests per window

const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = hits.get(ip)?.filter(t => now - t < RATE_LIMIT_WINDOW_MS) ?? [];
  hits.set(ip, timestamps);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  return false;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, ts] of hits) {
    const fresh = ts.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) hits.delete(ip);
    else hits.set(ip, fresh);
  }
}, 300_000);

// ─── Models ────────────────────────────────────────────────────────────────
const MAX_PROMPT_LENGTH = 2000;
const MAX_EXISTING_CONTENT = 60_000;
const MAX_BODY_SIZE = 65_000; // rough cap on total request body

const MODELS: Record<string, string> = {
  fast: 'google/gemini-2.5-flash',
  quality: 'minimax/minimax-m2.5',
};

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  headers: {
    'HTTP-Referer': 'https://ascii-wireframe-editor.app',
    'X-Title': 'ASCII Wireframe Editor',
  },
});

const SYSTEM_PROMPT = `You are a creative monospace canvas assistant. You fill a rectangular area with text/art based on the user's request. Output raw text only — no markdown fences, no explanation, no commentary.

You handle TWO kinds of requests:

═══════════════════════════════════════════
MODE 1: UI WIREFRAMES (default for UI-related prompts)
═══════════════════════════════════════════
When the user asks for UI elements (forms, dashboards, navbars, cards, pages, etc.):
- Draw LOW-FIDELITY wireframe sketches — think "whiteboard drawing"
- Keep it SIMPLE and STRUCTURAL. Show layout, not content.
- Draw at a COMPACT, natural size. CENTER in the available area with blank padding.
- Use short generic labels. Do NOT invent detailed realistic content.
- NEVER repeat rows to fill vertical space.
- Do NOT wrap the ENTIRE output in one big outer border unless asked.

UI ELEMENTS:
  ┌──────┐ └──────┘ │  │   Box borders
  [ Label ]                 Button
  [▾ Options      ]         Dropdown
  [_______________]         Text input
  ☐ Label   ☑ Label        Checkbox
  ○ Label   ● Label        Radio button
  ──────────                Separator
  ──→  ←──  ↓  ↑           Arrows

STRUCTURAL PATTERNS (compose screens from these):
  ┌──────┬──────┐   Table (┬/┴ columns, ├/┤ rows, ┼ intersections)
  │ Col  │ Col  │
  ├──────┼──────┤
  │      │      │
  └──────┴──────┘

  ┌──────────────┐   Card (box + title divider)
  │ Title        │
  ├──────────────┤
  │              │
  └──────────────┘

  ┌──────┬───────┐   Split panel (vertical divider)
  │      │       │
  └──────┴───────┘

  [ Tab 1 ]  Tab 2   Tab bar
  ──────────────────

   • Item 1            List
   • Item 2

  Logo  Link  [ CTA ]  Nav bar
  ────────────────────

JUNCTION CHARACTERS (for wireframes):
  ├ ┤ ┬ ┴ ┼ — use at every line intersection. Never leave bare │ where ─ meets it.

═══════════════════════════════════════════
MODE 2: ASCII ART & CREATIVE (for everything else)
═══════════════════════════════════════════
When the user asks for art, drawings, illustrations, portraits, logos, patterns, diagrams, maps, games, text effects, memes, or ANYTHING non-UI:

YOU MUST DRAW USING OUTLINES AND CONTOURS — like a pen sketch on paper.
Use these characters to draw lines and edges: / \\ | _ - ( ) { } < > ~ ^ . , ' \` = + :
The drawing must be mostly EMPTY SPACE (spaces) with lines forming the shape.

ABSOLUTE RULES:
- NEVER fill areas with ONE repeating character (no walls of 8888, ####, @@@@, ░░░░, etc.)
- Buildings, faces, figures, objects = OUTLINES with empty space inside. Think "pen drawing".
- Foliage, water, ground, hair = VARIED character textures. Mix %@#/\\|~*;:,. together. Never uniform.
- The subject must be RECOGNIZABLE. Prioritize clear shape and detail.
- ADD DETAIL: facial features, windows, doors, textures, small decorative elements. More detail = better.
- Use the FULL available area. Scale the drawing to fill the space.
- For text/word art: use large block letters or figlet-style typography.
- For patterns: use repetition and symmetry with varied characters.
- For diagrams/maps: use box-drawing chars, arrows, labels.

═══════════════════════════════════════════
UNIVERSAL RULES (both modes):
═══════════════════════════════════════════
1. Output EXACTLY the requested number of lines — no more, no fewer.
2. Every line MUST be EXACTLY the requested character width. Pad with spaces on the right.
3. Use Unicode box-drawing characters for borders: ┌ ┐ └ ┘ ─ │
4. Always close borders: every ┌ must have a matching ┐, every └ a matching ┘.
5. VERTICAL ALIGNMENT IS CRITICAL. │ characters on the same column MUST stay aligned.
6. When existing content is provided:
   - It is CONTEXT and STYLE REFERENCE, not something to copy literally.
   - ALWAYS draw what the user ASKS FOR. If they ask for a cat, draw a cat — don't keep the old content.
   - Take INSPIRATION from the existing style: character choices, line weight, spacing patterns.
   - Only PRESERVE existing content when the user explicitly asks to edit/fix/improve it.
   - If the user asks to fix/improve: keep the structure, fix specific issues.
   - If the user asks to add something: integrate with existing layout.
   - If the user asks for something NEW: draw it fresh, just match the artistic style.

═══════════════════════════════════════════
WIREFRAME EXAMPLES:
═══════════════════════════════════════════

EXAMPLE — "Dashboard" (50 chars × 12 lines):

┌──────────┬──────────────────────────┐
│ Nav      │  Dashboard               │
│          ├────────┬────────┬────────┤
│ Link     │ Card   │ Card   │ Card   │
│ Link     │        │        │        │
│ Link     ├────────┴────────┴────────┤
│          │                          │
│ ──────── │  Table / Content Area    │
│ Link     │                          │
│ Link     │                          │
│          │                          │
└──────────┴──────────────────────────┘

EXAMPLE — "Sign-in card" (40 chars × 10 lines):

┌──────────────────────────────────────┐
│            Sign In                   │
│                                      │
│  Email    [________________________] │
│  Password [________________________] │
│                                      │
│  ☑ Remember me                       │
│                                      │
│  [ Sign In ]    [ Forgot? ]          │
└──────────────────────────────────────┘

═══════════════════════════════════════════
ASCII ART EXAMPLES:
═══════════════════════════════════════════

EXAMPLE — "Frog" (30 chars × 6 lines):

            _     _
           (')-=-(')
         __(   "   )__
        / _/'-----'\\_ \\
     ___\\\\ \\\\     // //___
     >____)/_\\---/_\\(____<

EXAMPLE — "Woman" (24 chars × 14 lines):

      ,(())),
     '(("""))'
     '(|*_*|)'
       : = :
       _) (_
     /\`_ , _\`\\
    / (_>*<_) \\
   / / )   ( \\ \\
   \\ \\/  .  \\/ /
    \\_)\\___/(_/
     |  \\_/  )
      \\  /  /
       \\/  /
       (__;

EXAMPLE — "Church on a hill with trees" (55 chars × 19 lines):

                  _|_
                   |
                  / \\
                 //_\\\\
                //(_)\\\\
                 |/^\\|
       ,%%%%     // \\\\    ,@@@@@@@,
     ,%%%%/%%%  //   \\\\ ,@@@\\@@@@/@@,
 @@@%%%\\%%//%%%// === \\\\ @@\\@@@/@@@@@
@@@@%%%%\\%%%%%// =-=-= \\\\@@@@\\@@@@@@;%#####,
@@@@%%%\\%%/%%//   ===   \\\\@@@@@@/@@@%%%######,
@@@@@%%%%/%%//|         |\\\\@\\\\//@@%%%%%%#/####
'@@@@@%%\\\\/%~ |         | ~ @|| %\\\\//%%%#####;
  @@\\\\//@||   |  __ __  |    || %%||%%'######
   '@||  ||   | |  |  | |    ||   ||##\\//####
     ||  ||   | | -|- | |    ||   ||'#||###'
     ||  ||   |_|__|__|_|    ||   ||  ||
     ||  ||_/\`  =======  \`\\__||_._||  ||
   __||_/\`      =======            \`\\_||___`;

const NODES_SYSTEM_PROMPT = `You are a UI wireframe layout engine. You output a JSON array of UI component objects that form a wireframe mockup on a monospace character grid.

Each object MUST have:
- "type": one of: box, card, table, hsplit, placeholder, button, input, dropdown, checkbox, radio, toggle, search, tabs, nav, list, modal, progress, breadcrumb, pagination, text
- "x": column position (0 = left edge of area)
- "y": row position (0 = top edge of area)
- "width": width in columns
- "height": height in rows

Type-specific optional fields:
- button: "label" (string). Height is always 1. Width = label.length + 4. Renders as: [ Label ]
- input: "placeholder" (string). Height is always 1. Min width 5. Renders as: [___________]
- dropdown: "label" (string). Height 1. Renders as: [▾ Label     ]
- checkbox: "label" (string), "checked" (bool). Height 1. Renders as: ☐ Label / ☑ Label
- radio: "label" (string), "selected" (bool). Height 1. Renders as: ○ Label / ● Label
- toggle: "label" (string), "on" (bool). Height 1. Renders as: [●━] Label
- search: "placeholder" (string). Height 1. Renders as: [/ Search...   ]
- card: "title" (string). Min 6w×3h. Box with title row + divider.
- modal: "title" (string). Min 10w×4h. Box with title + close button + divider + action buttons.
- table: "columns" (string[]), "columnWidths" (number[]), "rowCount" (number). Min 8w×3h.
- tabs: "tabs" (string[]), "activeIndex" (number). Height always 2.
- nav: "logo" (string), "links" (string[]), "action" (string). Height always 2.
- list: "items" (string[]). Height = items count.
- progress: "value" (0-100). Height 1. Renders as: [████░░░░] 50%
- breadcrumb: "items" (string[]). Height 1. Renders as: Home > Page > Sub
- pagination: "currentPage" (number), "totalPages" (number). Height 1.
- hsplit: "ratio" (0-1). Min 8w×2h. Split panel with vertical divider.
- placeholder: "label" (string). Min 5w×2h. Box with centered label.
- box: no extra fields. Min 3w×2h. Simple border box.
- text: "content" (string). Free text, supports \\n for multiple lines.

RULES:
1. Coordinates are relative to the top-left corner of the available area (0,0).
2. Components MUST NOT overlap each other.
3. Components MUST fit within the given W×H area.
4. Use COMPACT, natural sizing. Leave whitespace between components for readability.
5. Use semantic types — use "button" not "text" with brackets, use "input" not "text" with underscores.
6. Use short, generic labels appropriate for the context.
7. Output ONLY a valid JSON array. No markdown, no explanation, no code fences.
8. Layout should look like a real wireframe — aligned, structured, professional.`;

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_SIZE) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { prompt, width, height, existingContent, mode, responseFormat } = body as {
    prompt: unknown; width: unknown; height: unknown; existingContent?: unknown; mode?: unknown; responseFormat?: unknown;
  };

  if (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: `Prompt must be 1-${MAX_PROMPT_LENGTH} characters` }, { status: 400 });
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) < 1 || (width as number) > 200 || (height as number) < 1 || (height as number) > 100) {
    return NextResponse.json({ error: 'Dimensions out of range (max 200×100)' }, { status: 400 });
  }
  if (existingContent != null && (typeof existingContent !== 'string' || existingContent.length > MAX_EXISTING_CONTENT)) {
    return NextResponse.json({ error: 'Existing content too large' }, { status: 400 });
  }

  const isNodesMode = responseFormat === 'nodes';
  const modelId = MODELS[mode === 'quality' ? 'quality' : 'fast'];
  const w = width as number;
  const h = height as number;

  if (isNodesMode) {
    // ─── Structured mode: return JSON array of SceneNode objects ───
    const nodesPrompt = existingContent
      ? `The ${w}×${h} area currently contains content. Replace it with: ${prompt}\n\nArea size: ${w} columns × ${h} rows. Output a JSON array of UI components.`
      : `${prompt}\n\nArea size: ${w} columns × ${h} rows. Output a JSON array of UI components.`;

    const result = streamObject({
      model: openrouter(modelId),
      system: NODES_SYSTEM_PROMPT,
      prompt: nodesPrompt,
      output: 'array',
      schema: wireframeNodeSchema,
      temperature: 0.7,
      maxOutputTokens: Math.max(4096, w * h * 4),
    });

    return result.toTextStreamResponse();
  }

  // ─── ASCII mode: return raw text stream ───
  let userPrompt: string;
  if (existingContent) {
    userPrompt = `Here is what's currently in the ${w}×${h} area (for STYLE REFERENCE only — do NOT copy it literally, draw what I ask for):\n\`\`\`\n${existingContent}\n\`\`\`\n\nDraw: ${prompt}\n\nUse the style/technique above as inspiration but draw what I asked for. Output EXACTLY ${w} chars wide and EXACTLY ${h} lines.`;
  } else {
    userPrompt = `${prompt}\n\nBe detailed and creative. Use the full area. Output EXACTLY ${w} chars wide and EXACTLY ${h} lines.`;
  }

  const result = streamText({
    model: openrouter(modelId),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
    maxOutputTokens: Math.max(4096, w * h * 4),
  });

  return result.toTextStreamResponse();
}
