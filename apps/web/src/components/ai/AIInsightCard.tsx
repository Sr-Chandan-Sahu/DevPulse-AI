import React from 'react';
import { AIAnalysis } from '../../types';
import { Sparkles, CheckCircle2, AlertOctagon, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIInsightCardProps {
  analysis: AIAnalysis;
  onAnalyzeMore?: () => void;
}

export function AIInsightCard({ analysis, onAnalyzeMore }: AIInsightCardProps) {
  const confidencePercent = Math.round(analysis.confidence_score * 100);

  return (
    <div className="bg-gradient-to-b from-[#151D33] to-[#111827] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1F2B3F]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-inner">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              Google Gemini Root Cause Analysis
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                {analysis.model}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated telemetry correlation & diagnostic report</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0E1524] px-3 py-1.5 rounded-lg border border-[#1F2B3F]">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-400">Confidence:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">{confidencePercent}%</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mt-4 p-4 rounded-xl bg-[#0E1524]/70 border border-[#1F2B3F]">
        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
          Executive Summary
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Probable Root Cause */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2">
          <AlertOctagon className="w-4 h-4" />
          Probable Root Cause
        </div>
        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-slate-200 leading-relaxed font-mono">
          {analysis.probable_root_cause}
        </div>
      </div>

      {/* Evidence & Signals */}
      {analysis.evidence && analysis.evidence.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            Supporting Telemetry Evidence
          </div>
          <div className="space-y-2">
            {analysis.evidence.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0E1524] border border-[#1F2B3F] text-xs text-slate-300"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2.5">
            Recommended Remediation Actions
          </div>
          <div className="space-y-2">
            {analysis.recommended_actions.map((act, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{act}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
