'use client';
import { ReactNode } from 'react';

export default function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-2xl">
        👜
      </div>
      <h2 className="text-xl md:text-2xl">{title}</h2>
      {subtitle ? (
        <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

