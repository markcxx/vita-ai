import { describe, expect, it } from 'vitest';
import { readJsonStream } from './read-json-stream';

describe('readJsonStream', () => {
  it('preserves split Chinese UTF-8 and multiple events including final line', async () => {
    const data = new TextEncoder().encode('{"type":"preview","text":"中文"}\n{"type":"complete"}');
    const response = new Response(new ReadableStream({ start(controller) {
      for (const byte of data) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    } }));
    const events: unknown[] = [];
    await readJsonStream(response, value => events.push(value));
    expect(events).toEqual([{ type: 'preview', text: '中文' }, { type: 'complete' }]);
  });
  it('propagates server failure instead of reporting completion', async () => {
    await expect(readJsonStream(new Response('{"type":"error"}\n'), () => { throw new Error('failed'); })).rejects.toThrow('failed');
  });
});
