import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface JSONViewerProps {
  data: any;
  initialExpanded?: boolean;
}

function JSONNode({ name, value, isLast = true }: { name?: string; value: any; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(true);

  if (value === null) {
    return (
      <div className="font-mono text-xs py-0.5">
        {name && <span className="text-sky-300">"{name}"</span>}: <span className="text-slate-500">null</span>{!isLast && ','}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="font-mono text-xs py-0.5">
        {name && <span className="text-sky-300">"{name}"</span>}: <span className="text-amber-400">{value ? 'true' : 'false'}</span>{!isLast && ','}
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="font-mono text-xs py-0.5">
        {name && <span className="text-sky-300">"{name}"</span>}: <span className="text-emerald-400">{value}</span>{!isLast && ','}
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className="font-mono text-xs py-0.5 break-all">
        {name && <span className="text-sky-300">"{name}"</span>}: <span className="text-emerald-300">"{value}"</span>{!isLast && ','}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="font-mono text-xs py-0.5">
          {name && <span className="text-sky-300">"{name}"</span>}: []{!isLast && ','}
        </div>
      );
    }

    return (
      <div className="font-mono text-xs py-0.5">
        <span onClick={() => setExpanded(!expanded)} className="cursor-pointer inline-flex items-center text-slate-400 hover:text-white">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 mr-0.5" /> : <ChevronRight className="w-3.5 h-3.5 mr-0.5" />}
          {name && <span className="text-sky-300">"{name}"</span>}: [ <span className="text-slate-500 text-[10px] ml-1">({value.length})</span>
        </span>
        {expanded && (
          <div className="pl-4 border-l border-[#1F2B3F] my-0.5">
            {value.map((item, idx) => (
              <JSONNode key={idx} value={item} isLast={idx === value.length - 1} />
            ))}
          </div>
        )}
        <span>]{!isLast && ','}</span>
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <div className="font-mono text-xs py-0.5">
          {name && <span className="text-sky-300">"{name}"</span>}: {`{}`}{!isLast && ','}
        </div>
      );
    }

    return (
      <div className="font-mono text-xs py-0.5">
        <span onClick={() => setExpanded(!expanded)} className="cursor-pointer inline-flex items-center text-slate-400 hover:text-white">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 mr-0.5" /> : <ChevronRight className="w-3.5 h-3.5 mr-0.5" />}
          {name && <span className="text-sky-300">"{name}"</span>}: {`{`}
        </span>
        {expanded && (
          <div className="pl-4 border-l border-[#1F2B3F] my-0.5">
            {keys.map((k, idx) => (
              <JSONNode key={k} name={k} value={value[k]} isLast={idx === keys.length - 1} />
            ))}
          </div>
        )}
        <span>{`}`}{!isLast && ','}</span>
      </div>
    );
  }

  return <div>{String(value)}</div>;
}

export function JSONViewer({ data }: JSONViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#090D14] border border-[#1F2B3F] rounded-lg p-3 text-slate-300 relative group overflow-x-auto">
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 p-1 rounded bg-[#151D2F] border border-[#1F2B3F] text-slate-400 hover:text-white transition-colors"
        title="Copy JSON"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <JSONNode value={data} />
    </div>
  );
}
