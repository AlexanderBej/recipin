import { useState } from 'react';
import { FiCoffee } from 'react-icons/fi';

export default function RecipePhoto({
  src,
  title,
  eager = false,
}: {
  src?: string;
  title: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const hasPhoto = typeof src === 'string' && src.trim() && failedSrc !== src;
  return (
    <div className={`collection-photo${hasPhoto ? '' : ' collection-photo--empty'}`}>
      {hasPhoto ? (
        <img
          src={src}
          alt={title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="collection-photo__fallback">
          <FiCoffee aria-hidden="true" />
          <span>No photo yet</span>
        </div>
      )}
    </div>
  );
}
