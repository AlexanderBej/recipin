import type { Restaurant, RestaurantImage } from '@api/models';
import { externalRestaurantUrl } from './restaurant-validation.utils';

export type GalleryImage = RestaurantImage & { dishId?: string; context: string; key: string };

export function restaurantGallery(restaurant: Restaurant): GalleryImage[] {
  const group = (urls: string[], photos: RestaurantImage[], context: string, dishId?: string) => {
    const entries = [
      ...photos,
      ...urls.filter(Boolean).map((url) => ({ id: `legacy:${url}`, url })),
    ];
    const seen = new Set<string>();
    return entries
      .filter((photo) => {
        if (seen.has(photo.url)) return false;
        seen.add(photo.url);
        return true;
      })
      .map((photo) => ({
        ...photo,
        context,
        dishId,
        key: `${dishId ?? 'restaurant'}:${photo.id}`,
      }));
  };
  return [
    ...group([restaurant.imageUrl ?? ''], restaurant.photos ?? [], restaurant.name),
    ...restaurant.dishes.flatMap((dish) =>
      group(dish.images, dish.photos ?? [], dish.name, dish.id),
    ),
  ];
}

export function restaurantImageSource(photo: RestaurantImage, width?: number) {
  const url = externalRestaurantUrl(photo.url);
  if (!url) return '';
  const endpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT?.replace(/\/$/, '');
  if (width && photo.provider === 'imagekit' && endpoint && url.startsWith(`${endpoint}/`)) {
    const result = new URL(url);
    result.searchParams.set('tr', `w-${width},q-80,f-auto`);
    return result.href;
  }
  return url;
}
