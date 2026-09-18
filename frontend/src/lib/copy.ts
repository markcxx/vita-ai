import copy from '@/content/copy.json';

type CopyValues = Record<string, string | number | Date>;
export type CopyReader = (key: string, values?: CopyValues) => string;
const readers = new Map<string, CopyReader>();

/** Read the single Chinese UI copy file; no locale, provider or translation runtime. */
export function getCopy(section = ''): CopyReader {
  const cached = readers.get(section);
  if (cached) return cached;
  const reader: CopyReader = (key, values) => {
    const path = section ? `${section}.${key}` : key;
    const value = path.split('.').reduce<unknown>((node, part) =>
      node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined, copy);
    if (typeof value !== 'string') {
      console.error(`Missing UI copy: ${path}`);
      return '暂未配置文案';
    }
    return value.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      values?.[name] !== undefined ? String(values[name]) : placeholder);
  };
  readers.set(section, reader);
  return reader;
}
