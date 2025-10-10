import React, { PropsWithChildren } from 'react';

type SectionProps = {
  title: string;
};

export const Section: React.FC<PropsWithChildren<SectionProps>> = ({ title, children }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
    <div className="text-sm text-gray-200 font-medium mb-2">{title}</div>
    {children}
  </div>
);
