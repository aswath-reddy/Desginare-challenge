import React from 'react';

export function ActivityCardSkeleton() {
  return (
    <div className="bg-white border border-[#E5E3DD] rounded-[20px] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[#F0EEE8]" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/2 bg-[#F0EEE8] rounded" />
        <div className="h-5 w-4/5 bg-[#F0EEE8] rounded" />
        <div className="h-3 w-2/3 bg-[#F0EEE8] rounded" />
        <div className="pt-3 border-t border-[#E5E3DD] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#F0EEE8]" />
            <div className="h-3 w-20 bg-[#F0EEE8] rounded" />
          </div>
          <div className="h-3 w-16 bg-[#F0EEE8] rounded" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-72 bg-[#F0EEE8] rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
        <ActivityCardSkeleton />
      </div>
    </div>
  );
}
