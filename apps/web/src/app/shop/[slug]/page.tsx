'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, MapPin, Plus, Minus, ArrowLeft, Heart } from 'lucide-react';
import { useCart } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites-store';
import type { Product } from '@/types';

interface Region {
  code: string;
  name: string;
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [volumeIndex, setVolumeIndex] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const add = useCart((s) => s.add);
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const volumes = [
    { label: '100г', multiplier: 0.5 },
    { label: '200г', multiplier: 1 },
    { label: '500г', multiplier: 2.5 },
    { label: '1кг', multiplier: 5 }
  ];

  const currentVolume = volumes[volumeIndex];
  const pricePerUnit = product ? Math.round((product.price_cents ?? 0) * currentVolume.multiplier) : 0;
  const totalPrice = pricePerUnit * quantity;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug as string)}`);
        if (!res.ok) {
          setProduct(null);
          return;
        }
        const p = await res.json();
        setProduct(p);

        // Load region info
        if (p.region_code) {
          const regionRes = await fetch(`/api/regions/${p.region_code}`);
          if (regionRes.ok) {
            const regionData = await regionRes.json();
            setRegion(regionData);
          }
        }
      } catch (error) {
        console.error('Failed to load product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`;
  };

  const handleAddToCart = () => {
    if (!product) return;

    add(
      {
        id: `${product.slug}-${currentVolume.label}`,
        title: `${product.title} (${currentVolume.label})`,
        priceCents: pricePerUnit,
        image: product.images?.[0],
      },
      quantity
    );
    
    setAddedToCart(true);
    setQuantity(1); // Reset quantity after adding to cart
    setVolumeIndex(1); // Reset volume to default after adding to cart
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const goToMap = () => {
    window.location.href = `/map?region=${product?.region_code}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-10">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="aspect-square bg-gray-200 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-10">
          <Link href="/shop" className="inline-flex items-center text-sm text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Вернуться в каталог
          </Link>
          <h1 className="text-2xl">Товар не найден</h1>
        </main>
        <Footer />
      </div>
    );
  }

  const mainImage = product.images?.[0];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-10">
        <Link href="/shop" className="inline-flex items-center text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Вернуться в каталог
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-50">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.title}
                  width={1200}
                  height={1400}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Нет изображения
                </div>
              )}
            </div>

            {/* Additional Images */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-neutral-200">
                    <Image
                      src={img}
                      alt={`${product.title} - фото ${idx + 2}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-8 px-4 sm:px-8 max-w-md">
            <div>
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold flex-1">{product.title}</h1>
                {/* Favorites Button - top right corner */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => product && toggleFavorite(product)}
                  className="ml-4 transition-all duration-200 hover:scale-110"
                >
                  {isFavorite(product?.id || 0) ? (
                    <Heart className="h-6 w-6 fill-red-500 text-red-500" />
                  ) : (
                    <Heart className="h-6 w-6" />
                  )}
                </Button>
              </div>
              <div className="text-3xl font-bold text-primary mt-4">
                {formatPrice(pricePerUnit)}
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {product.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-8">
              <p className="text-muted-foreground leading-relaxed text-base">
                {product.description || 'Описание товара будет добавлено позже.'}
              </p>
            </div>

            {/* Volume Selection */}
            <div className="mt-8">
              <label className="text-sm font-medium mb-3 block">Выбор веса:</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                {volumes.map((vol, idx) => (
                  <Button
                    key={vol.label}
                    variant={volumeIndex === idx ? 'default' : 'outline'}
                    onClick={() => setVolumeIndex(idx)}
                    size="sm"
                  >
                    {vol.label}
                  </Button>
                ))}
              </div>

              <label className="text-sm font-medium mb-3 block mt-6">Количество:</label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="text-sm text-muted-foreground ml-auto">
                  Итого: {formatPrice(totalPrice)}
                </div>
              </div>
            </div>

            {/* Stock Status */}
            <div className="mt-8">
              {product.in_stock ? (
                <span className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1 inline-block">
                  ✓ В наличии
                </span>
              ) : (
                <span className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-full px-3 py-1 inline-block">
                  ✗ Нет в наличии
                </span>
              )}
            </div>

            {/* CTA Section */}
            <section aria-labelledby="purchase" className="mt-12 border-t border-neutral-200 pt-8 px-4 sm:px-0">
              <div className="flex flex-col space-y-6">
                {/* Add to Cart Button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!product.in_stock || addedToCart}
                  className={`w-full rounded-full py-3.5 text-base transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                    addedToCart 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  {addedToCart ? '✓ В корзине' : product.in_stock ? <><ShoppingCart className="h-4 w-4 inline mr-2" />Добавить в корзину</> : 'Нет в наличии'}
                </button>

                {/* View on Map Button */}
                {product.region_code && (
                  <Link href={`/map?region=${product.region_code}&product=${product.slug}`}>
                    <button 
                      type="button"
                      className="w-full rounded-full border border-neutral-300 py-3 text-sm hover:border-neutral-800 hover:bg-neutral-50 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-neutral-300 inline-flex items-center justify-center"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Посмотреть на карте
                    </button>
                  </Link>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
