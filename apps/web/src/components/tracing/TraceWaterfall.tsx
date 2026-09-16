import React, { useState } from 'react';
import { Span } from '../../types';
import { formatLatency, cn } from '../../lib/utils';
import { Database, HardDrive, Globe, Server, Code, ChevronRight, ChevronDown } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { JSONViewer } from '../ui/JSONViewer';

interface TraceWaterfallProps {
  spans: Span[];
  totalDurationMs: number;
}

export function TraceWaterfall({ spans, totalDurationMs }: TraceWaterfallProps) {
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Set<string>>(new Set());

  if (!spans || spans.length === 0) {
    return <div className="p-8 text-center text-slate-400 text-xs">No span traces recorded for this transaction.</div>;
  }

  // Find min start timestamp to calculate offsets
  const startTimes = spans.map((s) => new Date(s.start_time).getTime());
  const minStartTime = Math.min(...startTimes);
  const effectiveTotal = Math.max(totalDurationMs, 1.0);

  const getSpanIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="w-3.5 h-3.5 text-amber-400" />;
      case 'cache': return <HardDrive className="w-3.5 h-3.5 text-purple-400" />;
      case 'external': return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case 'http': return <Server className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Code className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getSpanBarColor = (type: string) => {
    switch (type) {
      case 'database': return 'bg-amber-500/80 border-amber-400';
      case 'cache': return 'bg-purple-500/80 border-purple-400';
      case 'external': return 'bg-sky-500/80 border-sky-400';
      case 'http': return 'bg-emerald-500/80 border-emerald-400';
      default: return 'bg-brand-500/80 border-brand-400';
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-lg">
      {/* Time Header Grid */}
      <div className="grid grid-cols-12 px-4 py-2 bg-[#0E1524] border-b border-[#1F2B3F] text-[11px] font-mono text-slate-500">
        <div className="col-span-5 font-sans font-semibold text-slate-400 uppercase tracking-wider">
          Operation / Span Hierarchy
        </div>
        <div className="col-span-1 font-sans font-semibold text-slate-400 uppercase tracking-wider text-right pr-2">
          Duration
        </div>
        <div className="col-span-6 flex justify-between px-2">
          <span>0ms</span>
          <span>{(effectiveTotal * 0.25).toFixed(0)}ms</span>
          <span>{(effectiveTotal * 0.5).toFixed(0)}ms</span>
          <span>{(effectiveTotal * 0.75).toFixed(0)}ms</span>
          <span>{effectiveTotal.toFixed(0)}ms</span>
        </div>
      </div>

      {/* Waterfall Rows */}
      <div className="divide-y divide-[#1F2B3F]/40 font-mono text-xs">
        {spans.map((span) => {
          const spanStartTime = new Date(span.start_time).getTime();
          const offsetMs = Math.max(0, spanStartTime - minStartTime);
          const leftPercent = Math.min(95, Math.max(0, (offsetMs / effectiveTotal) * 100));
          const widthPercent = Math.max(2, Math.min(100 - leftPercent, (span.duration_ms / effectiveTotal) * 100));
          const depth = span.parent_span_id ? 1 : 0;

          return (
            <div
              key={span.span_id}
              onClick={() => setSelectedSpan(span)}
              className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-[#1A2438] cursor-pointer transition-colors group"
            >
              {/* Span Name & Service */}
              <div
                className="col-span-5 flex items-center gap-2 truncate pr-3"
                style={{ paddingLeft: `${depth * 18}px` }}
              >
                {getSpanIcon(span.span_type)}
                <span className="font-sans font-medium text-slate-200 truncate group-hover:text-white">
                  {span.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F2B3F] text-slate-400 font-sans">
                  {span.service}
                </span>
              </div>

              {/* Duration Text */}
              <div className="col-span-1 text-right font-medium text-slate-300 pr-2">
                {formatLatency(span.duration_ms)}
              </div>

              {/* Timeline Bar */}
              <div className="col-span-6 relative h-5 flex items-center bg-[#090D14]/40 rounded px-1">
                <div
                  className={cn(
                    'absolute h-3.5 rounded border transition-all duration-300 flex items-center px-1.5 shadow-sm',
                    getSpanBarColor(span.span_type)
                  )}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                >
                  {widthPercent > 15 && (
                    <span className="text-[10px] text-white font-bold truncate">
                      {formatLatency(span.duration_ms)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Span Drawer */}
      <Drawer
        isOpen={!!selectedSpan}
        onClose={() => setSelectedSpan(null)}
        title={selectedSpan?.name}
        subtitle={`${selectedSpan?.service} • ${formatLatency(selectedSpan?.duration_ms || 0)}`}
        size="md"
      >
        {selectedSpan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#151D2F] p-3 rounded-lg border border-[#1F2B3F]">
              <div>
                <span className="text-slate-400">Span ID:</span>
                <div className="font-mono text-slate-200 mt-0.5">{selectedSpan.span_id}</div>
              </div>
              <div>
                <span className="text-slate-400">Span Type:</span>
                <div className="font-mono text-slate-200 mt-0.5 uppercase">{selectedSpan.span_type}</div>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>
                <div className="font-mono text-emerald-400 mt-0.5 font-bold">
                  {formatLatency(selectedSpan.duration_ms)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Start Time:</span>
                <div className="font-mono text-slate-200 mt-0.5">{selectedSpan.start_time}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Span Attributes
              </h4>
              <JSONViewer data={selectedSpan.attributes || {}} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
