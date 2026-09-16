import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  isLoading,
  emptyMessage = 'No telemetry records found.',
  page,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-[#151D2F] border border-[#1F2B3F] rounded-xl overflow-hidden p-6 space-y-3">
        <div className="h-6 bg-slate-800/60 rounded animate-pulse w-full" />
        <div className="h-10 bg-slate-800/40 rounded animate-pulse w-full" />
        <div className="h-10 bg-slate-800/40 rounded animate-pulse w-full" />
        <div className="h-10 bg-slate-800/40 rounded animate-pulse w-full" />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#151D2F] border border-[#1F2B3F] rounded-xl overflow-hidden shadow-lg shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0E1524] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1F2B3F]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn('px-4 py-3', col.headerClassName)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2B3F]/60">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id ? String(row.id) : rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    'transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-[#1A2438]' : ''
                  )}
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={cn('px-4 py-3 text-slate-200', col.className)}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : col.accessor
                        ? (row[col.accessor] as any)
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page && totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#0E1524] border-t border-[#1F2B3F] text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded bg-[#151D2F] border border-[#1F2B3F] hover:bg-[#1F2B3F] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded bg-[#151D2F] border border-[#1F2B3F] hover:bg-[#1F2B3F] disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
