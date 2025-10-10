import React from 'react';

type Props = { title: string; subtitle?: string; actions?: React.ReactNode };

export default function PageTitle({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p className="page-subtitle">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
