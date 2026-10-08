import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiChevronLeft, FiChevronRight, FiImage, FiX } from 'react-icons/fi';
import type { RestaurantImage } from '@api/models';
import { restaurantImageSource, type GalleryImage } from './restaurant-images.utils';

export function RestaurantImagePreview({
  photo,
  alt,
  eager = false,
}: {
  photo: RestaurantImage;
  alt: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState('');
  const src = restaurantImageSource(photo, eager ? 1600 : 480);
  return (
    <div className="restaurant-gallery-photo">
      {src && failed !== src ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          {...(photo.provider === 'imagekit' && !eager && src !== photo.url
            ? {
                srcSet: `${restaurantImageSource(photo, 240)} 240w, ${src} 480w, ${restaurantImageSource(photo, 960)} 960w`,
                sizes: '(max-width: 760px) 45vw, 240px',
              }
            : {})}
          onError={() => setFailed(src)}
        />
      ) : (
        <div
          className="restaurant-gallery-photo__missing"
          role="img"
          aria-label={`${alt}: image unavailable`}
        >
          <FiImage />
          <span>Image unavailable</span>
        </div>
      )}
    </div>
  );
}

export default function RestaurantGalleryViewer({
  images,
  selected,
  close,
}: {
  images: GalleryImage[];
  selected: string | null;
  close: () => void;
}) {
  const [key, setKey] = useState(selected);
  useEffect(() => {
    setKey(selected);
  }, [selected]);
  const index = images.findIndex((image) => image.key === key);
  const image = images[index];
  const move = (direction: number) => {
    if (images.length)
      setKey(images[(Math.max(index, 0) + direction + images.length) % images.length].key);
  };
  return (
    <Dialog.Root
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="restaurant-viewer-overlay" />
        <Dialog.Content
          className="restaurant-viewer"
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}
        >
          <header>
            <Dialog.Title>{image?.context ?? 'Photo unavailable'}</Dialog.Title>
            <Dialog.Close
              className="restaurant-icon"
              aria-label="Close gallery"
              title="Close gallery"
            >
              <FiX />
            </Dialog.Close>
          </header>
          {image ? (
            <RestaurantImagePreview key={image.key} photo={image} alt={image.context} eager />
          ) : (
            <p>This photo is no longer available.</p>
          )}
          <footer>
            <button
              className="restaurant-icon"
              aria-label="Previous photo"
              title="Previous photo"
              disabled={images.length < 2}
              onClick={() => move(-1)}
            >
              <FiChevronLeft />
            </button>
            <p aria-live="polite">{image ? `${index + 1} / ${images.length}` : ''}</p>
            <button
              className="restaurant-icon"
              aria-label="Next photo"
              title="Next photo"
              disabled={images.length < 2}
              onClick={() => move(1)}
            >
              <FiChevronRight />
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
