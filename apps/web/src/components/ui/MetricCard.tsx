import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean; // positive = green/good, or inverted for errors/latency
    label: string;
  };
  icon?: LucideIcon;
  badge?: React.ReactNode;
  accentColor?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  badge,
  accentColor = 'text-brand-400',
}: MetricCardProps) {
  return (
    <div className="bg-[#151D2F] border border-[#1F2B3F] hover:border-[#2E3F5C] transition-all rounded-xl p-5 relative overflow-hidden shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-[#111827] border border-[#1F2B3F]">
            <Icon className={cn('w-4 h-4', accentColor)} />
          </div>
        )}
        {badge}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>

      {trend && (
        <div className="mt-3 flex items-center text-xs gap-1.5 pt-2 border-t border-[#1F2B3F]/60">
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className={cn('font-semibold', trend.isPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {trend.value}
          </span>
          <span className="text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
