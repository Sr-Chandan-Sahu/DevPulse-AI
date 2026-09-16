import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjectStore } from '../../stores/projectStore';

const RANGES = [
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1h' },
  { id: '6h', label: '6h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
];

export function DateRangePicker() {
  const { timeRange, setTimeRange } = useProjectStore();

  return (
    <div className="inline-flex items-center p-1 bg-[#111827] border border-[#1F2B3F] rounded-lg">
      <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
      <div className="flex items-center gap-0.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setTimeRange(r.id)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              timeRange === r.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
