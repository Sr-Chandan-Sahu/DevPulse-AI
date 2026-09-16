import React, { useState, useMemo } from 'react';
import { Span } from '../../types';
import { formatLatency, cn } from '../../lib/utils';
import { Search, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { JSONViewer } from '../ui/JSONViewer';

interface FlameGraphProps {
  spans: Span[];
  totalDurationMs: number;
}

interface FlameNode {
  span: Span;
  depth: number;
  offsetMs: number;
  durationMs: number;
  widthPercent: number;
  leftPercent: number;
  children: FlameNode[];
}

export function FlameGraph({ spans, totalDurationMs }: FlameGraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [hoveredNode, setHoveredNode] = useState<FlameNode | null>(null);

  const effectiveTotal = Math.max(totalDurationMs, 1.0);

  // Build tree hierarchy
  const treeNodes = useMemo(() => {
    if (!spans || spans.length === 0) return [];

    const startTimes = spans.map((s) => new Date(s.start_time).getTime());
    const minStart = Math.min(...startTimes);

    // Group by parent
    const spanMap = new Map<string, Span>();
    const childrenMap = new Map<string, Span[]>();

    spans.forEach((s) => {
      spanMap.set(s.span_id, s);
      const pId = s.parent_span_id || 'root';
      if (!childrenMap.has(pId)) childrenMap.set(pId, []);
      childrenMap.get(pId)!.push(s);
    });

    function buildNode(span: Span, depth: number): FlameNode {
      const sStart = new Date(span.start_time).getTime();
      const offsetMs = Math.max(0, sStart - minStart);
      const leftPercent = (offsetMs / effectiveTotal) * 100;
      const widthPercent = Math.max(1, (span.duration_ms / effectiveTotal) * 100);

      const children = (childrenMap.get(span.span_id) || []).map((c) =>
        buildNode(c, depth + 1)
      );

      return {
        span,
        depth,
        offsetMs,
        durationMs: span.duration_ms,
        leftPercent,
        widthPercent,
        children,
      };
    }

    const rootSpans = spans.filter((s) => !s.parent_span_id || !spanMap.has(s.parent_span_id));
    return rootSpans.map((r) => buildNode(r, 0));
  }, [spans, effectiveTotal]);

  // Flatten nodes by depth level for flamegraph rows
  const depthRows = useMemo(() => {
    const rows: FlameNode[][] = [];
    function traverse(node: FlameNode) {
      if (!rows[node.depth]) rows[node.depth] = [];
      rows[node.depth].push(node);
      node.children.forEach(traverse);
    }
    treeNodes.forEach(traverse);
    return rows;
  }, [treeNodes]);

  const getNodeColor = (node: FlameNode) => {
    const isMatched =
      searchQuery.trim() !== '' &&
      (node.span.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.span.service.toLowerCase().includes(searchQuery.toLowerCase()));

    if (isMatched) return 'bg-rose-500 border-rose-300 text-white animate-pulse shadow-lg shadow-rose-500/50';

    switch (node.span.span_type) {
      case 'database':
        return 'bg-amber-600/80 hover:bg-amber-500 border-amber-400/60 text-amber-100';
      case 'cache':
        return 'bg-purple-600/80 hover:bg-purple-500 border-purple-400/60 text-purple-100';
      case 'external':
        return 'bg-sky-600/80 hover:bg-sky-500 border-sky-400/60 text-sky-100';
      case 'http':
        return 'bg-emerald-600/80 hover:bg-emerald-500 border-emerald-400/60 text-emerald-100';
      default:
        return 'bg-indigo-600/80 hover:bg-indigo-500 border-indigo-400/60 text-indigo-100';
    }
  };

  if (!spans || spans.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs bg-[#111827] border border-[#1F2B3F] rounded-xl">
        No spans available for flame graph visualization.
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* Controls Bar */}
      <div className="p-3 bg-[#0E1524] border-b border-[#1F2B3F] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spans or services..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#151D2F] border border-[#1F2B3F] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#151D2F] p-1 rounded-lg border border-[#1F2B3F]">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1F2B3F] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1F2B3F] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1F2B3F] transition-colors ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hover Info Banner */}
      <div className="px-4 py-2 bg-[#151D2F]/70 border-b border-[#1F2B3F] flex items-center justify-between text-xs font-mono">
        {hoveredNode ? (
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold font-sans">{hoveredNode.span.name}</span>
            <span className="text-slate-400">
              Service: <span className="text-slate-200">{hoveredNode.span.service}</span>
            </span>
            <span className="text-emerald-400 font-bold">
              {formatLatency(hoveredNode.durationMs)}
            </span>
            <span className="text-slate-400">
              ({((hoveredNode.durationMs / effectiveTotal) * 100).toFixed(1)}% of trace)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5" />
            <span className="text-[11px] font-sans">Hover over any frame to inspect duration; click to view attributes.</span>
          </div>
        )}
      </div>

      {/* Flame Graph Visual Canvas */}
      <div className="p-4 overflow-x-auto min-h-[300px]">
        <div
          className="space-y-1.5 transition-transform duration-200 origin-top-left"
          style={{ width: `${100 * zoomLevel}%` }}
        >
          {depthRows.map((row, depthIdx) => (
            <div key={depthIdx} className="relative h-7 w-full bg-[#090D14]/40 rounded overflow-hidden">
              {row.map((node) => (
                <div
                  key={node.span.span_id}
                  onClick={() => setSelectedSpan(node.span)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{
                    left: `${node.leftPercent}%`,
                    width: `${node.widthPercent}%`,
                  }}
                  className={cn(
                    'absolute inset-y-0.5 rounded border px-2 flex items-center justify-between text-[11px] cursor-pointer transition-all truncate select-none shadow-sm',
                    getNodeColor(node)
                  )}
                  title={`${node.span.name} (${formatLatency(node.durationMs)})`}
                >
                  <span className="truncate font-sans font-medium">{node.span.name}</span>
                  {node.widthPercent > 10 && (
                    <span className="ml-1 text-[10px] font-mono opacity-90 shrink-0">
                      {formatLatency(node.durationMs)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Drawer */}
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
                <span className="text-slate-400">Type:</span>
                <div className="font-mono text-slate-200 mt-0.5 uppercase">{selectedSpan.span_type}</div>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>
                <div className="font-mono text-emerald-400 mt-0.5 font-bold">
                  {formatLatency(selectedSpan.duration_ms)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Service:</span>
                <div className="font-mono text-slate-200 mt-0.5">{selectedSpan.service}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Attributes & Execution Context
              </h4>
              <JSONViewer data={selectedSpan.attributes || {}} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
