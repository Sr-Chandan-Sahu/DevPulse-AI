import React from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-[#1F2B3F]/60', className)} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#151D2F] border border-[#1F2B3F] p-5 rounded-xl space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#151D2F] border border-[#1F2B3F] p-5 rounded-xl h-72">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="bg-[#151D2F] border border-[#1F2B3F] p-5 rounded-xl h-72">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    </div>
  );
}
