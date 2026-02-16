import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You generate ASCII wireframe mockups. Output raw monospace text only — no markdown fences, no explanation.

Elements:
  +--------+       [ Button ]       [ ] Unchecked      ( ) Radio
  | Box    |       [v Dropdown  ]   [x] Checked        (*) Selected
  +--------+       [____________]   --- line  --> arrow

Example — sign-in form (40 chars wide, 11 lines):
+--------------------------------------+
|             Sign In                  |
|                                      |
|  Email:                              |
|  [________________________________]  |
|  Password:                           |
|  [________________________________]  |
|                                      |
|  [x] Remember me                     |
|  [ Sign In ]  [ Sign up with Google ]|
+--------------------------------------+

Rules:
- Start at column 0, no left margin
- Use the full width, boxes span edge to edge
- Close all borders on both sides
- No blank lines at top`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
  }

  const { prompt, width, height, existingContent } = await req.json();

  let userPrompt: string;
  if (existingContent) {
    userPrompt = `Area ${width}x${height} contains:\n\`\`\`\n${existingContent}\n\`\`\`\nRequest: ${prompt}\nOutput ~${width} chars wide, ${height} lines.`;
  } else {
    userPrompt = `${prompt}\nOutput ~${width} chars wide, ${height} lines.`;
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

  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];

  // Detect if inner content is mostly dashes (separator/border line)
  const inner = trimmed.length > 2 ? trimmed.slice(1, -1) : '';
  const dashCount = (inner.match(/[-]/g) || []).length;
  const isSeparator = inner.length > 0 && dashCount / inner.length > 0.6;

  // Too long — trim while preserving closing border char
  if (trimmed.length > width) {
    if ((lastChar === '|' || lastChar === '+') && (firstChar === '|' || firstChar === '+')) {
      return trimmed.slice(0, width - 1) + lastChar;
    }
    return trimmed.slice(0, width);
  }

  // Exact width — fix missing closing border
  if (trimmed.length === width) {
    if (firstChar === '+' && lastChar === '-') {
      return trimmed.slice(0, -1) + '+';
    }
    return trimmed;
  }

  // Shorter than width — needs expansion
  const gap = width - trimmed.length;
  const fillChar = isSeparator ? '-' : ' ';

  // Line ends with border char — stretch to fill width
  if (lastChar === '|' || lastChar === '+') {
    const before = trimmed.slice(0, -1);
    return before + fillChar.repeat(gap) + lastChar;
  }

  // Unclosed border: +---... or |---... without closing char
  if (lastChar === '-' && (firstChar === '+' || firstChar === '|')) {
    const closeChar = firstChar === '+' ? '+' : '|';
    return trimmed + '-'.repeat(gap - 1) + closeChar;
  }

  // Default: pad with spaces
  return trimmed + ' '.repeat(gap);
}
