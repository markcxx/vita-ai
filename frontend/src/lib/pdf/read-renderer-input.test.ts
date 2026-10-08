import { describe, expect, it } from 'vitest';
import { readRendererInput } from '../../../scripts/read-renderer-input';

async function* chunks(values: Uint8Array[]) { yield* values; }

describe('renderer UTF-8 input', () => {
  it('preserves Chinese and emoji across every possible pipe boundary', async () => {
    const text = JSON.stringify({ summary: '订单全流程管理，工程师 🚀', avatar: 'data:image/png;base64,AAAA' });
    const bytes = Buffer.from(text);
    for (let split = 1; split < bytes.length; split++) {
      const decoded = await readRendererInput(chunks([bytes.subarray(0, split), bytes.subarray(split)]));
      expect(decoded).toBe(text);
      expect(JSON.parse(decoded).summary).toBe('订单全流程管理，工程师 🚀');
    }
    expect(await readRendererInput(chunks([...bytes].map(byte => Uint8Array.of(byte))))).toBe(text);
  });
  it('enforces the byte limit even for multibyte input', async () => {
    await expect(readRendererInput(chunks([Buffer.from('程')]), 2)).rejects.toThrow('Resume payload too large');
    expect(await readRendererInput(chunks([Buffer.from('程')]), 3)).toBe('程');
  });
});
