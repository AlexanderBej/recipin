import type { Restaurant } from '@api/models';

export function normalizedRestaurantName(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export type RestaurantSort = 'updated' | 'added' | 'name' | 'rating';
export function filterRestaurants(
  items: Restaurant[],
  {
    search = '',
    favorite = false,
    blacklisted = false,
    cuisine = '',
    tag = '',
    sort = 'updated',
  }: {
    search?: string;
    favorite?: boolean;
    blacklisted?: boolean;
    cuisine?: string;
    tag?: string;
    sort?: RestaurantSort;
  },
) {
  const needle = normalizedRestaurantName(search);
  return items
    .filter(
      (item) =>
        (!favorite || item.favorite) &&
        (!blacklisted || item.blacklisted) &&
        (!cuisine || item.cuisine === cuisine || item.category === cuisine) &&
        (!tag || item.tags.includes(tag)) &&
        (!needle ||
          normalizedRestaurantName(
            [item.name, item.cuisine, item.category, item.notes, ...item.tags]
              .filter(Boolean)
              .join(' '),
          ).includes(needle)),
    )
    .sort((a, b) => {
      const difference =
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : sort === 'rating'
            ? (b.rating ?? -Infinity) - (a.rating ?? -Infinity)
            : sort === 'added'
              ? (b.createdAt ?? 0) - (a.createdAt ?? 0)
              : (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0);
      return difference || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
}

export function randomRestaurant(items: Restaurant[], previousId?: string): Restaurant | null {
  const eligible = items.filter((item) => !item.blacklisted);
  const alternatives = eligible.filter((item) => item.id !== previousId);
  const pool = alternatives.length ? alternatives : eligible;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
