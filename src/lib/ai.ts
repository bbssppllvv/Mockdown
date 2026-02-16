export async function generateMagicContent(
  prompt: string,
  width: number,
  height: number,
  existingContent?: string
): Promise<string> {
  const res = await fetch('/api/magic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, existingContent }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data.result;
}
