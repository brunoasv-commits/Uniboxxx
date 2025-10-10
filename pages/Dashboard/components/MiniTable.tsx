
import React from 'react';

export function MiniTable({ title, columns, rows, empty="Sem dados", onMore }:{
  title:string;
  columns: Array<{ key:string; label:string; align?:'left'|'right' }>;
  rows: Array<Record<string, any>>;
  empty?: string;
  onMore?: ()=>void;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-200 font-medium">{title}</div>
        {onMore && (
          <button data-variant="chip" onClick={onMore} className="!text-xs !h-7">Ver tudo</button>
        )}
      </div>
      <div className="flex-grow">
        {rows.length === 0 ? (
          <div className="text-xs text-gray-500 flex items-center justify-center h-full">{empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400">
                <tr>
                  {columns.map(c=>(
                    <th key={c.key} className={`py-2 px-2 font-medium ${c.align==='right'?'text-right':'text-left'}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {rows.map((r,i)=>(
                  <tr key={i} className="border-t border-white/10 hover:bg-white/5">
                    {columns.map(c=>(
                      <td key={c.key} className={`py-2 px-2 ${c.align==='right'?'text-right':''}`}>
                        {r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
