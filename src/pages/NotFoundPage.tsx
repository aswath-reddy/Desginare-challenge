import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/src/components/BrandLogo';
import { useAuth } from '@/src/context/AuthContext';

export function NotFoundPage() {
  const { firebaseUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#080808] flex flex-col items-center justify-center px-6 text-center space-y-6">
      <BrandLogo variant="dark" size="md" />
      <div className="space-y-2.5 max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#747474] tabular-nums">
          404
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.1]">
          This plan isn&apos;t on the calendar.
        </h1>
        <p className="text-sm text-[#747474] leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        to={firebaseUser ? '/discover' : '/'}
        className="rounded-full bg-[#080808] text-[#F8F6F0] px-7 py-3 text-sm font-medium hover:bg-[#222] active:scale-[0.98] transition-all"
      >
        {firebaseUser ? 'Back to Discover' : 'Back to home'}
      </Link>
    </div>
  );
}
