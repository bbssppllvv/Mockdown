/** Stream generated content from the AI, calling onLine for each completed line. */
export async function streamGenerateContent(
  prompt: string,
  width: number,
  height: number,
  onLine: (lineIndex: number, fittedLine: string) => void,
  existingContent?: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, existingContent }),
    signal,
  });

  if (!res.ok) {
    let error = 'Generation failed';
    try {
      const data = await res.json();
      error = data.error || error;
    } catch { /* non-JSON error body */ }
    throw new Error(error);
  }

  if (!res.body) {
    throw new Error('No response stream');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let lineIndex = 0;
  let fenceSkipped = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      buffer += chunk;

      while (buffer.includes('\n')) {
        const nlIndex = buffer.indexOf('\n');
        const line = buffer.slice(0, nlIndex);
        buffer = buffer.slice(nlIndex + 1);

        // Skip opening code fence
        if (lineIndex === 0 && !fenceSkipped && line.trim().startsWith('```')) {
          fenceSkipped = true;
          continue;
        }

        if (lineIndex < height) {
          onLine(lineIndex, fitLine(line, width));
          lineIndex++;
        }
      }
    }

    // Handle last line (no trailing newline)
    if (buffer.length > 0 && lineIndex < height) {
      // Skip closing code fence
      if (!(buffer.trim().startsWith('```') && fenceSkipped)) {
        onLine(lineIndex, fitLine(buffer, width));
        lineIndex++;
      }
    }

    // Fill remaining lines with spaces
    while (lineIndex < height) {
      onLine(lineIndex, ' '.repeat(width));
      lineIndex++;
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/** Post-process the full AI output into fitted lines for final application. */
export function postProcessGenerate(raw: string, width: number, height: number): string[] {
  let cleaned = raw;
  const fenceMatch = cleaned.match(/^```[^\n]*\n([\s\S]*?)```\s*$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
  }

  let lines = cleaned.split('\n').map(l => l.replace(/\r$/, ''));
  lines = lines.map(line => fitLine(line, width));

  while (lines.length < height) lines.push(' '.repeat(width));
  if (lines.length > height) lines.length = height;

  return lines;
}

function fitLine(line: string, width: number): string {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0) return ' '.repeat(width);
  if (trimmed.length === width) return trimmed;
  if (trimmed.length > width) return trimmed.slice(0, width);
  return trimmed + ' '.repeat(width - trimmed.length);
}
