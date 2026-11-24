import React from 'react';

interface BrandLogoProps {
  variant?: 'dark' | 'light';
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({
  variant = 'dark',
  iconOnly = false,
  size = 'md',
}: BrandLogoProps) {
  const fg = variant === 'dark' ? '#080808' : '#F8F6F0';
  const bg = variant === 'dark' ? '#F8F6F0' : '#080808';
  const iconSize = size === 'sm' ? 22 : size === 'lg' ? 30 : 26;
  const textClass =
    size === 'sm'
      ? 'text-lg'
      : size === 'lg'
        ? 'text-2xl'
        : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="28" height="28" rx="9" fill={fg} />
        <path
          d="M11.5 11.75V20.25M7.25 16H15.75"
          stroke={bg}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M19.5 12.9L22.5 11.1V20.9"
          stroke={bg}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span
          className={`font-display font-bold tracking-tight leading-none ${textClass}`}
          style={{ color: fg }}
        >
          plusone.
        </span>
      )}
    </span>
  );
}
