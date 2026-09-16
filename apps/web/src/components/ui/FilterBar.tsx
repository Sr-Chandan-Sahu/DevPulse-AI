import React from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  filters?: {
    id: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (val: string) => void;
  }[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search requests, paths, trace IDs...',
  filters = [],
  onRefresh,
  isRefreshing,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151D2F] border border-[#1F2B3F] p-3 rounded-xl">
      <div className="flex flex-1 items-center gap-2 min-w-[240px]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <div key={f.id} className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">{f.label}:</span>
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="bg-[#0E1524] border border-[#1F2B3F] rounded-lg text-xs text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-[#0E1524] border border-[#1F2B3F] hover:bg-[#1A2438] text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-brand-400')} />
          </button>
        )}
      </div>
    </div>
  );
}
