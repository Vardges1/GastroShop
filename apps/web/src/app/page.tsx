'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites-store';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart } from 'lucide-react';
import type { Product } from '@/types';

const regions = [
  { code: 'ALL', name: 'Все' },
  { code: 'FR', name: 'Франция' },
  { code: 'IT', name: 'Италия' },
  { code: 'ES', name: 'Испания' },
  { code: 'GR', name: 'Греция' },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const add = useCart((s) => s.add);
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products?page_size=8');
        if (res.ok) {
          const data = await res.json();
          // Add created_at to products if not present
          const productsWithDates = (data.items || []).map((p: any) => ({
            ...p,
            created_at: p.created_at || new Date().toISOString()
          }));
          setProducts(productsWithDates);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    selectedRegion === 'ALL' ? true : p.region_code === selectedRegion
  );

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-16">
          <div className="animate-pulse text-center">Загрузка...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-16">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
            Европейские деликатесы
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Качественные сыры, хамоны и гастрономические продукты напрямую от производителей
          </p>
        </section>

        <section className="flex justify-center gap-2 mb-12">
          {regions.map((r) => (
            <button
              key={r.code}
              onClick={() => setSelectedRegion(r.code)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedRegion === r.code
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              {r.name}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const isInFavorites = isFavorite(product.id);
            return (
            <div key={product.id} className="group">
              <Link href={`/shop/${product.slug}`}>
                <div className="aspect-square bg-neutral-100 rounded-lg mb-3 overflow-hidden relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(product);
                    }}
                    className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                  >
                    <Heart className={`h-5 w-5 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
                  </button>
                  <Image
                    src={product.images?.[0] || '/placeholder.jpg'}
                    alt={product.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="space-y-2">
                <Link href={`/shop/${product.slug}`}>
                  <h3 className="font-medium text-sm leading-tight hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                </Link>
                <p className="text-sm text-neutral-600">{formatPrice(product.price_cents || 0)}</p>
                <div className="flex flex-wrap gap-1">
                  {product.tags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-neutral-100 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    add(
                      {
                        id: product.slug,
                        title: product.title,
                        priceCents: product.price_cents || 0,
                        image: product.images?.[0],
                      },
                      1
                    );
                    setAddedItems((prev) => new Set(prev).add(product.slug));
                    setTimeout(() => {
                      setAddedItems((prev) => {
                        const next = new Set(prev);
                        next.delete(product.slug);
                        return next;
                      });
                    }, 2000);
                  }}
                  disabled={!product.in_stock}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {addedItems.has(product.slug)
                    ? '✓ Добавлено!'
                    : product.in_stock
                    ? 'В корзину'
                    : 'Нет в наличии'}
                </Button>
              </div>
            </div>
            );
          })}
        </section>

        <section className="text-center mt-16">
          <Link href="/shop">
            <Button size="lg">Посмотреть весь каталог</Button>
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
