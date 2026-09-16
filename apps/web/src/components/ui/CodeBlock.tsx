import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  maxHeight?: string;
}

export function CodeBlock({ code, language = 'json', className, maxHeight = 'max-h-96' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('relative group bg-[#090D14] border border-[#1F2B3F] rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111827] border-b border-[#1F2B3F] text-[11px] text-slate-400 font-mono">
        <span>{language.toUpperCase()}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className={cn('p-4 text-xs font-mono text-slate-300 overflow-x-auto overflow-y-auto leading-relaxed', maxHeight)}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
