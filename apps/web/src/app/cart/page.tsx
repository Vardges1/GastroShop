'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, formatPrice } from '@/store/cart';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import SimpleButton from '@/components/ui/simple-button';
import EmptyState from '@/components/ui/empty-state';

export default function CartPage() {
  const { items, inc, dec, remove, clear } = useCart();
  const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-12">
        {/* Заголовок */}
        <header className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">Корзина</h1>
        </header>

        {/* Пустое состояние */}
        {items.length === 0 ? (
          <EmptyState
            title="В корзине пусто"
            subtitle="Загляните в каталог — мы подобрали отличные сыры, хамоны и соусы."
            action={
              <Link href="/shop">
                <SimpleButton>Перейти в каталог</SimpleButton>
              </Link>
            }
          />
        ) : (
          <>
            {/* Список позиций */}
            <div className="divide-y border-y">
              {items.map((i) => {
                // Extract slug from ID (format: "slug-volume")
                const slug = i.id.split('-').slice(0, -1).join('-');
                return (
                <div key={i.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                  <Link href={`/shop/${slug}`}>
                    <div className="h-24 w-24 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 hover:opacity-80 transition-opacity">
                      {i.image ? (
                        <Image
                          src={i.image}
                          alt={i.title}
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link href={`/shop/${slug}`}>
                      <div className="truncate text-base hover:text-primary transition-colors cursor-pointer">{i.title}</div>
                    </Link>
                    <div className="text-sm text-neutral-500">{formatPrice(i.priceCents)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SimpleButton className="px-3 py-1" onClick={() => dec(i.id)}>-</SimpleButton>
                    <span className="w-6 text-center">{i.qty}</span>
                    <SimpleButton className="px-3 py-1" onClick={() => inc(i.id)}>+</SimpleButton>
                  </div>

                  <div className="w-28 text-right font-medium">{formatPrice(i.priceCents * i.qty)}</div>

                  <button
                    className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
                    onClick={() => remove(i.id)}
                  >
                    удалить
                  </button>
                </div>
                );
              })}
            </div>

            {/* Итог и действия */}
            <div className="mt-8 flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
              <button
                className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900"
                onClick={clear}
              >
                Очистить корзину
              </button>

              <div className="flex items-center gap-4">
                <div className="text-lg">
                  Итого: <span className="font-semibold">{formatPrice(totalCents)}</span>
                </div>
                <Link href="/checkout">
                  <SimpleButton>Оформить заказ</SimpleButton>
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
