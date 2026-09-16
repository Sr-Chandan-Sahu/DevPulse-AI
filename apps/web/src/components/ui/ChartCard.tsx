import React from 'react';
import { cn } from '../../lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, headerRight, children, className }: ChartCardProps) {
  return (
    <div className={cn('bg-[#151D2F] border border-[#1F2B3F] rounded-xl p-5 shadow-lg shadow-black/20 flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="flex-1 w-full min-h-[220px]">{children}</div>
    </div>
  );
}
