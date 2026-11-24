import React, { useState } from 'react';
import { Compass } from 'lucide-react';

interface EditorialImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function EditorialImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-[#F0EEE8] text-[#747474] flex flex-col items-center justify-center p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-6 h-6 mb-2 text-[#080808]/40" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-[#080808]/60 line-clamp-2 max-w-[18ch]">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export function UserAvatar({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [failed, setFailed] = useState(false);
  const dims =
    size === 'xs'
      ? 'w-6 h-6 text-[10px]'
      : size === 'sm'
        ? 'w-8 h-8 text-xs'
        : size === 'lg'
          ? 'w-14 h-14 text-base'
          : size === 'xl'
            ? 'w-20 h-20 text-xl'
            : 'w-10 h-10 text-sm';

  const initials = (name || 'P')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (!src || failed) {
    return (
      <div
        className={`${dims} rounded-full bg-[#080808] text-[#F8F6F0] font-display font-semibold flex items-center justify-center shrink-0 border border-[#E5E3DD]`}
        aria-label={name}
      >
        {initials || 'P'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dims} rounded-full object-cover shrink-0 border border-[#E5E3DD] bg-[#F0EEE8]`}
    />
  );
}
