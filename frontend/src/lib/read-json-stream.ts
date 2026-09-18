/** Read newline-delimited JSON across arbitrary UTF-8/network chunk boundaries. */
export async function readJsonStream(response: Response, onEvent: (event: Record<string, unknown>) => void) {
  if (!response.body) throw new Error('生成连接不可用');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) if (line.trim()) onEvent(JSON.parse(line));
      if (done) { if (pending.trim()) onEvent(JSON.parse(pending)); break; }
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
