/** Server-only configuration values. Only explicitly selected UI values leave the server. */
export function getConfigValue(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

export function getBooleanConfig(key: string, fallback = false): boolean {
  const value = getConfigValue(key);
  return value ? ['true', '1', 'yes', 'on'].includes(value.toLowerCase()) : fallback;
}
