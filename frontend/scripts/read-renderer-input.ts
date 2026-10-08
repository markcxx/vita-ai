import { StringDecoder } from 'node:string_decoder';

/** Pipe chunks can split a UTF-8 character, especially after large avatar data. */
export async function readRendererInput(chunks: AsyncIterable<Uint8Array>, maxBytes = 30_000_000): Promise<string> {
  const decoder = new StringDecoder('utf8');
  let input = '';
  let bytes = 0;
  for await (const chunk of chunks) {
    bytes += chunk.byteLength;
    if (bytes > maxBytes) throw new Error('Resume payload too large');
    input += decoder.write(Buffer.from(chunk));
  }
  return input + decoder.end();
}
