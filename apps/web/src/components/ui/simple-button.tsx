'use client';
import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export default function SimpleButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center rounded-full border border-neutral-900 px-6 py-2 text-sm',
        'transition hover:bg-neutral-900 hover:text-white',
        className
      )}
    />
  );
}

