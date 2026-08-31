import { useState } from 'react';
import { ImageOff } from 'lucide-react';

type AspectRatio = 'hero' | '16:9' | '4:3' | '3:2' | '1:1' | 'portrait' | 'wide' | 'technical' | 'free';

interface KrafImageProps {
  src?: string;
  alt?: string;
  title?: string;
  caption?: string;
  credit?: string;
  aspect?: AspectRatio;
  fit?: 'cover' | 'contain';
  className?: string;
  showPlaceholder?: boolean;
}

const aspectClasses: Record<AspectRatio, string> = {
  hero: 'aspect-video',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '3:2': 'aspect-[3/2]',
  '1:1': 'aspect-square',
  portrait: 'aspect-[3/4]',
  wide: 'aspect-[21/9]',
  technical: 'aspect-[16/10]',
  free: '',
};

export function KrafImage({
  src,
  alt = '',
  title,
  caption,
  credit,
  aspect = '16:9',
  fit = 'cover',
  className = '',
  showPlaceholder = true,
}: KrafImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const showImage = src && !error;

  return (
    <figure className={`relative overflow-hidden ${className}`}>
      <div className={`${aspectClasses[aspect]} relative bg-k-graphite`}>
        {showImage ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-k-graphite">
                <div className="w-8 h-8 border-2 border-k-steel-light border-t-k-blue rounded-full animate-spin" />
              </div>
            )}
            <img
              src={src}
              alt={alt}
              className={`w-full h-full object-${fit} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              loading="lazy"
            />
          </>
        ) : showPlaceholder ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-k-graphite">
            {/* KRAEFEGG placeholder */}
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-xl bg-k-steel/50 flex items-center justify-center">
                <ImageOff className="w-6 h-6 text-k-steel-light" />
              </div>
              {/* Subtle gradient accent line */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 kraefegg-gradient rounded-full opacity-40" />
            </div>
            <span className="text-[10px] text-k-text-dim tracking-widest uppercase font-mono">KRAEFEGG</span>
          </div>
        ) : null}
      </div>

      {(title || caption || credit) && (
        <figcaption className="mt-3 space-y-1">
          {title && <p className="text-sm font-semibold text-k-text-primary">{title}</p>}
          {caption && <p className="text-xs text-k-text-muted leading-relaxed">{caption}</p>}
          {credit && <p className="text-[10px] text-k-text-dim">{credit}</p>}
        </figcaption>
      )}
    </figure>
  );
}
