function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

export function isChineseInterviewReport(report: unknown): boolean {
  const content = collectStrings(report).join(' ');
  const chineseCount = content.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinCount = content.match(/[A-Za-z]/g)?.length ?? 0;

  return chineseCount > 0 && chineseCount >= latinCount * 0.2;
}
