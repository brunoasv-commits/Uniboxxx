import React from 'react';

type FieldProps = {
  label: string;
  children?: React.ReactNode;
};

export const Field = ({label, children}: FieldProps) => (
  <label className="block">
    <span className="text-xs text-gray-300">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export const baseInput =
  "rounded-xl bg-white/5 border border-white/10 px-3 h-10 text-sm text-gray-200 w-full outline-none focus:ring-2 focus:ring-sky-600";

export const Input = ({className='', ...p}:any)=><input {...p} className={`${baseInput} ${className}`} />;
export const Select = ({className='', ...p}:any)=><select {...p} className={`${baseInput} ${className}`} />;
export const Textarea = ({className='', ...p}:any)=><textarea {...p} className={`${baseInput} ${className} h-28`} />;
export const Checkbox = (p:any)=><input type="checkbox" {...p} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-600" />;