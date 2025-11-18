import { Ingredient } from '@api/models';

export function toHoursAndMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

export function formatHoursAndMinutes(totalMinutes: number) {
  const { hours, minutes } = toHoursAndMinutes(totalMinutes);

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

// You can type this better if you have Firestore types wired
export function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;

  // number (millis)
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Firestore Timestamp (has a toDate method)
  // We check this way to avoid importing Firestore types here.
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as any).toDate();
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }

  return null;
}

export const buildIngredient = (ingredient: Ingredient): string => {
  const { quantity, unit, item } = ingredient;
  if (quantity) {
    if (unit) {
      return `${quantity} ${unit} ${item}`;
    }
    return `${quantity} ${item}`;
  }
  return item;
};

export function normalizeTagForStorage(tag: string): string {
  return tag
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase → "SugarFree" → "Sugar Free"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace spaces/dashes/underscores/etc with "-"
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-|-$/g, ''); // trim leading/trailing dashes
}

export function displayTag(tag: string): string {
  return tag
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
