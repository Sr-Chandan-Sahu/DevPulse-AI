import React from 'react';
import { cn, getStatusColor, getMethodColor, formatLatency } from '../../lib/utils';

export function StatusBadge({ status }: { status: number }) {
  const { text, bg, border } = getStatusColor(status);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border',
        text,
        bg,
        border
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const colorClass = getMethodColor(method);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold border',
        colorClass
      )}
    >
      {method.toUpperCase()}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string }) {
  let color = 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (severity === 'MEDIUM') color = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (severity === 'HIGH') color = 'text-orange-400 bg-orange-500/10 border-orange-500/20';
  if (severity === 'CRITICAL') color = 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse';

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', color)}>
      {severity}
    </span>
  );
}

export function ServiceBadge({ service }: { service: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1F2B3F]/60 text-slate-300 border border-[#2B3B55]">
      {service}
    </span>
  );
}

export function LatencyBadge({ ms }: { ms: number }) {
  let color = 'text-emerald-400 bg-emerald-500/10';
  if (ms > 300) color = 'text-amber-400 bg-amber-500/10';
  if (ms > 800) color = 'text-rose-400 bg-rose-500/10 font-bold';

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-mono', color)}>
      {formatLatency(ms)}
    </span>
  );
}
