import { NextRequest, NextResponse } from 'next/server';
import { isBoxCorner, isBoxVertical, isBoxHorizontal } from '@/lib/box-chars';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You generate wireframe mockups for a monospace grid editor. Output raw text only — no markdown fences, no explanation, no commentary.

The user has selected a rectangular area on their canvas. Your output fills that area EXACTLY.

RULES:
1. Output EXACTLY the requested number of lines — no more, no fewer.
2. Every line MUST be EXACTLY the requested character width. Pad lines with spaces on the right to reach the exact width.
3. Do NOT wrap output in a border box UNLESS the user explicitly asks for a "box", "card", "panel", "dialog", or "frame". Most UI (navbars, menus, button rows, lists) should NOT have an outer border.
4. No leading blank lines — start meaningful content on line 1.
5. Use Unicode box-drawing characters for borders: ┌ ┐ └ ┘ ─ │
6. Always close borders: every ┌ must have a matching ┐, every └ a matching ┘.

ELEMENTS:
  ┌──────┐ └──────┘ │  │   Box borders (only when requested)
  [ Label ]                 Button
  [v Options      ]         Dropdown
  [_______________]         Text input
  [ ] Label   [x] Label    Checkbox
  ( ) Label   (*) Label    Radio button
  ──────────                Horizontal rule / separator
  ──→  ←──  ↓  ↑           Arrows

EXAMPLE 1 — "Navigation bar" (44 chars × 3 lines):
No outer border — user did not ask for a box.

Home    About    Pricing    [ Sign In ]
────────────────────────────────────────────


EXAMPLE 2 — "Sign-in card" (40 chars × 10 lines):
Has border — user said "card".

┌──────────────────────────────────────┐
│            Sign In                   │
│                                      │
│  Email    [________________________] │
│  Password [________________________] │
│                                      │
│  [x] Remember me                     │
│                                      │
│  [ Sign In ]  [ Forgot password? ]   │
└──────────────────────────────────────┘

EXAMPLE 3 — "Sidebar menu" (20 chars × 7 lines):
No outer border — just a list.

Dashboard
Projects
Team
────────────────────
Analytics
Settings
[ Logout ]

EXAMPLE 4 — "Two buttons and a link" (30 chars × 1 line):
[ Cancel ]     [ Save ]  Help

EXAMPLE 5 — editing existing content, prompt "Add a title above the inputs":
Given area already contains UI elements. Modify in place — do NOT add a new outer border.

Contact Us

Name  [_____________________]
Email [_____________________]
[ Submit ]                    `;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
  }

  const { prompt, width, height, existingContent } = await req.json();

  let userPrompt: string;
  if (existingContent) {
    userPrompt = `The selected ${width}×${height} area contains:\n\`\`\`\n${existingContent}\n\`\`\`\nRequest: ${prompt}\nOutput EXACTLY ${width} chars wide and EXACTLY ${height} lines. Do not add an outer border unless I asked for one.`;
  } else {
    userPrompt = `${prompt}\nOutput EXACTLY ${width} chars wide and EXACTLY ${height} lines. Do not add an outer border unless I asked for one.`;
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ascii-wireframe-editor.app',
      'X-Title': 'ASCII Wireframe Editor',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: Math.max(4096, width * height * 4),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `OpenRouter error ${res.status}: ${err}` }, { status: res.status });
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  const result = postProcess(content, width, height);
  return NextResponse.json({ result });
}

function postProcess(raw: string, width: number, height: number): string {
  // Strip code fences
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(cleaned.indexOf('\n') + 1);
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, cleaned.lastIndexOf('```'));
    }
    cleaned = cleaned.trim();
  }

  let lines = cleaned.split('\n').map(l => l.replace(/\r$/, ''));

  // Strip common leading whitespace
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length > 0) {
    const minIndent = Math.min(...nonEmpty.map(l => {
      const m = l.match(/^( *)/);
      return m ? m[1].length : 0;
    }));
    if (minIndent > 0) {
      lines = lines.map(l => l.length > minIndent ? l.slice(minIndent) : l.trimStart());
    }
  }

  // Strip leading/trailing blank lines
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  // Expand each line to exactly `width` chars, stretching borders
  lines = lines.map(line => expandLine(line, width));

  // Ensure exactly `height` lines
  while (lines.length < height) lines.push(' '.repeat(width));
  if (lines.length > height) lines.length = height;

  return lines.join('\n');
}

function expandLine(line: string, width: number): string {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0) return ' '.repeat(width);
  if (trimmed.length === width) return trimmed;

  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  const firstIsBorder = isBoxVertical(firstChar) || isBoxCorner(firstChar);
  const lastIsBorder = isBoxVertical(lastChar) || isBoxCorner(lastChar);

  // Too long — trim, preserving closing border if both ends are borders
  if (trimmed.length > width) {
    if (firstIsBorder && lastIsBorder) {
      return trimmed.slice(0, width - 1) + lastChar;
    }
    return trimmed.slice(0, width);
  }

  // Shorter than width — stretch bordered lines, pad everything else with spaces
  const gap = width - trimmed.length;

  if (firstIsBorder && lastIsBorder) {
    // Detect fill character: ─ for separator/border lines, space for content lines
    const inner = trimmed.length > 2 ? trimmed.slice(1, -1) : '';
    let hCount = 0;
    for (const c of inner) { if (isBoxHorizontal(c)) hCount++; }
    const fillChar = inner.length > 0 && hCount / inner.length > 0.6 ? '─' : ' ';
    return trimmed.slice(0, -1) + fillChar.repeat(gap) + lastChar;
  }

  return trimmed + ' '.repeat(gap);
}
