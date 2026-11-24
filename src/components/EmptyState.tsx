import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-[#E5E3DD] rounded-[20px] px-6 py-14 sm:py-16 text-center max-w-xl mx-auto">
      <Icon className="w-6 h-6 text-[#080808]/60 mx-auto mb-4" strokeWidth={1.5} />
      <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-[#080808] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[#747474] leading-relaxed max-w-sm mx-auto mb-7">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="rounded-full bg-[#080808] text-[#F8F6F0] px-6 py-2.5 text-sm font-medium hover:bg-[#1E1E1E] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-full border border-[#E5E3DD] bg-white text-[#080808] px-6 py-2.5 text-sm font-medium hover:bg-[#F0EEE8] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
