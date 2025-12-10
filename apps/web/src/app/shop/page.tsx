'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useCart } from '@/store/cart';
import { useFavoritesStore } from '@/store/favorites-store';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Heart } from 'lucide-react';

interface Product {
  id: number;
  slug: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  tags: string[];
  region_code: string;
  images: string[];
  in_stock: boolean;
}

const regions = [
  { code: 'ALL', name: 'Все регионы' },
  { code: 'FR', name: 'Франция' },
  { code: 'IT', name: 'Италия' },
  { code: 'ES', name: 'Испания' },
  { code: 'CH', name: 'Швейцария' },
  { code: 'NL', name: 'Нидерланды' },
  { code: 'DE', name: 'Германия' },
];

const categories = [
  { 
    id: 'cheese', 
    name: 'Сыры', 
    tags: ['cheese'] 
  },
  { 
    id: 'ham', 
    name: 'Хамоны', 
    tags: ['ham', 'cured']
  },
  { 
    id: 'charcuterie', 
    name: 'Колбасы', 
    tags: ['charcuterie', 'salami'] 
  },
  { 
    id: 'prosciutto', 
    name: 'Прошутто', 
    tags: ['prosciutto'] 
  },
  { 
    id: 'soft-cheese', 
    name: 'Мягкие сыры', 
    tags: ['cheese', 'soft'] 
  },
  { 
    id: 'hard-cheese', 
    name: 'Твердые сыры', 
    tags: ['cheese', 'hard'] 
  },
  { 
    id: 'blue-cheese', 
    name: 'Сыры с плесенью', 
    tags: ['cheese', 'blue'] 
  },
  { 
    id: 'aged-cheese', 
    name: 'Выдержанные сыры', 
    tags: ['cheese', 'aged'] 
  },
];

function ShopPageContent() {
  // Fallback for useTranslations during static generation
  const t = typeof window !== 'undefined' ? useTranslations() : (key: string) => key;
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const add = useCart((s) => s.add);

  useEffect(() => {
    async function loadProducts() {
      try {
        // Request all products without pagination limit
        const res = await fetch('/api/products?page_size=1000');
        if (res.ok) {
          const data = await res.json();
          console.log('Loaded products:', data.items?.length || 0, 'total:', data.total);
          // Filter and log ham products
          const hamProducts = (data.items || []).filter((p: Product) => 
            p.tags?.includes('ham')
          );
          console.log('Ham products found:', hamProducts.length, hamProducts.map((p: Product) => ({
            title: p.title,
            in_stock: p.in_stock,
            tags: p.tags
          })));
          
          // Show all products, even if out of stock (they'll be marked as unavailable)
          const visibleProducts = data.items || [];
          setProducts(visibleProducts);
          setFilteredProducts(visibleProducts);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    if (selectedRegion !== 'ALL') {
      filtered = filtered.filter((p) => p.region_code === selectedRegion);
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p) => {
        return selectedCategories.some((categoryId) => {
          const category = categories.find((c) => c.id === categoryId);
          if (!category) return false;
          // Check if product has at least one tag from category
          // For ham category, product needs to have 'ham' tag
          return category.tags.some((tag) => p.tags.includes(tag));
        });
      });
    }

    // Get search query from URL params if exists
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');

    const searchToUse = searchQuery || urlSearch || '';
    if (searchToUse) {
      const query = searchToUse.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return (a.price_cents || 0) - (b.price_cents || 0);
        case 'price-desc':
          return (b.price_cents || 0) - (a.price_cents || 0);
        case 'name':
        default:
          return a.title.localeCompare(b.title, 'ru');
      }
    });

    setFilteredProducts(filtered);
    
    // Set search from URL if present
    if (urlSearch && !searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [products, selectedRegion, selectedCategories, searchQuery, sortBy]);

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Каталог товаров</h1>
          <p className="text-muted-foreground">
          </p>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          <Input
            type="text"
            placeholder="Поиск по названию, описанию или тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">Регион:</span>
            {regions.map((region) => (
              <Button
                key={region.code}
                variant={selectedRegion === region.code ? 'default' : 'outline'}
                onClick={() => setSelectedRegion(region.code)}
                size="sm"
              >
                {region.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">Категория:</span>
            <Button
              variant={selectedCategories.length === 0 ? 'default' : 'outline'}
              onClick={() => setSelectedCategories([])}
              size="sm"
            >
              Все категории
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedCategories((prev) =>
                    prev.includes(category.id)
                      ? prev.filter((c) => c !== category.id)
                      : [...prev, category.id]
                  );
                }}
                size="sm"
              >
                {category.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium mr-2">Сортировка:</span>
            <Button
              variant={sortBy === 'name' ? 'default' : 'outline'}
              onClick={() => setSortBy('name')}
              size="sm"
            >
              По названию
            </Button>
            <Button
              variant={sortBy === 'price-asc' ? 'default' : 'outline'}
              onClick={() => setSortBy('price-asc')}
              size="sm"
            >
              Цена ↑
            </Button>
            <Button
              variant={sortBy === 'price-desc' ? 'default' : 'outline'}
              onClick={() => setSortBy('price-desc')}
              size="sm"
            >
              Цена ↓
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg" />
                <div className="h-4 bg-gray-200 rounded mt-2" />
                <div className="h-4 bg-gray-200 rounded mt-2 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isInFavorites = isFavorite(product.id);
              return (
              <div key={product.id} className="group relative">
                <Link href={`/shop/${product.slug}`}>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3 relative">
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
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.title}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Нет изображения
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {product.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="font-bold text-lg">{formatPrice(product.price_cents)}</div>
                </Link>

                <Button
                  className={`w-full mt-3 transition-colors ${addedItems.has(product.slug) ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    add(
                      {
                        id: product.slug,
                        title: product.title,
                        priceCents: product.price_cents,
                        image: product.images?.[0],
                      },
                      1
                    );
                    setAddedItems(prev => new Set(prev).add(product.slug));
                    setTimeout(() => {
                      setAddedItems(prev => {
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
              );
            })}
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Товары не найдены. Попробуйте изменить фильтры.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    }>
      <ShopPageContent />
    </Suspense>
  );
}

