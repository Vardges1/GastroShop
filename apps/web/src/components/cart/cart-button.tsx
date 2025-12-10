'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCart } from '@/store/cart';

export default function CartButton() {
  const t = useTranslations('cart');
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="text-sm inline-flex items-center gap-2 rounded-full border border-neutral-900 px-4 py-2 hover:bg-neutral-900 hover:text-white transition"
    >
      {t('button')} <span className="opacity-70">({count()})</span>
    </Link>
  );
}

