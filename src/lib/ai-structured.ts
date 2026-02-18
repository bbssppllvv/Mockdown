// Client-side streaming for structured AI generation (JSON array of SceneNodes)
import { AINodeRaw, validateAndFixNode } from '@/lib/scene/ai-schema';
import { NewNodeData } from '@/lib/scene/types';

/**
 * Stream-generate structured UI nodes from the AI.
 * POSTs to /api/generate with responseFormat='nodes', reads the streamed JSON array
 * incrementally, and calls onNode() for each validated node as it's parsed.
 */
export async function streamGenerateNodes(
  prompt: string,
  width: number,
  height: number,
  onNode: (node: NewNodeData) => void,
  existingContent?: string,
  signal?: AbortSignal,
  mode: 'fast' | 'quality' = 'fast',
): Promise<NewNodeData[]> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, existingContent, mode, responseFormat: 'nodes' }),
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
  let buffer = '';
  let lastParsedCount = 0;
  const allNodes: NewNodeData[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Incremental parsing: try to parse the buffer as a complete JSON array
      // by appending ']' if it's incomplete
      const nodes = tryParsePartialArray(buffer);
      if (nodes && nodes.length > lastParsedCount) {
        // Process newly parsed nodes
        for (let i = lastParsedCount; i < nodes.length; i++) {
          const validated = validateAndFixNode(nodes[i], width, height);
          if (validated) {
            allNodes.push(validated);
            onNode(validated);
          }
        }
        lastParsedCount = nodes.length;
      }
    }

    // Final parse attempt on complete buffer
    const finalNodes = tryParsePartialArray(buffer);
    if (finalNodes && finalNodes.length > lastParsedCount) {
      for (let i = lastParsedCount; i < finalNodes.length; i++) {
        const validated = validateAndFixNode(finalNodes[i], width, height);
        if (validated) {
          allNodes.push(validated);
          onNode(validated);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (allNodes.length === 0) {
    throw new Error('No valid UI components generated. Try a different prompt.');
  }

  return allNodes;
}

/**
 * Try to parse a partial JSON array by appending ']' to close it.
 * Returns the parsed array if successful, null otherwise.
 */
function tryParsePartialArray(buffer: string): AINodeRaw[] | null {
  const trimmed = buffer.trim();
  if (!trimmed.startsWith('[')) return null;

  // Try parsing as-is first (complete array)
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not complete yet */ }

  // Try closing the array — handle trailing commas and incomplete objects
  // Strip any trailing incomplete object (unclosed '{')
  let attempt = trimmed;

  // Remove trailing comma if present
  if (attempt.endsWith(',')) {
    attempt = attempt.slice(0, -1);
  }

  // If it ends with a partial object, find the last complete object
  const lastCloseBrace = attempt.lastIndexOf('}');
  if (lastCloseBrace > 0) {
    attempt = attempt.slice(0, lastCloseBrace + 1);
    // Remove trailing comma after the brace
    attempt = attempt.replace(/,\s*$/, '');
  }

  // Try closing with ']'
  try {
    const parsed = JSON.parse(attempt + ']');
    if (Array.isArray(parsed)) return parsed;
  } catch { /* still invalid */ }

  return null;
}
