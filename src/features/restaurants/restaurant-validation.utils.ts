export function externalRestaurantUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function imageReferences(value: string): string[] {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.some((line) => !externalRestaurantUrl(line)))
    throw new Error('Use complete http or https image URLs.');
  return [...new Set(lines)];
}
