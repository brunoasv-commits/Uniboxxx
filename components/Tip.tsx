import React from 'react';

export default function Tip({label, children}:{label:string; children?:React.ReactNode}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap
        rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 transition z-20
        group-hover/tip:opacity-100">{label}</span>
    </span>
  );
}