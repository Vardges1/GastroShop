'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { api } from '@/lib/api';
import type { Order, Product } from '@/types';
import { User, Mail, Lock, Heart, Package, MapPin, Calendar, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function AccountPageContent() {
  // Fallback for useTranslations during static generation
  const t = typeof window !== 'undefined' ? useTranslations() : (key: string) => key;
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, setAuth, logout, accessToken } = useAuthStore();
  const { favorites, removeFavorite } = useFavoritesStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [productsMap, setProductsMap] = useState<Map<number, Product>>(new Map());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuth(data.user, data.access_token, data.refresh_token);
        // Redirect admin to admin panel
        if (data.user?.role === 'admin') {
          router.push('/admin');
        }
      } else {
        alert('Ошибка входа. Проверьте данные.');
      }
    } catch (error) {
      alert('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuth(data.user, data.access_token, data.refresh_token);
      } else {
        alert('Ошибка регистрации');
      }
    } catch (error) {
      alert('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadOrders();
      // Redirect admin to admin panel if they're on account page
      if (user?.role === 'admin') {
        router.push('/admin');
      }
    }
  }, [isAuthenticated, accessToken, user, router]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const ordersData = await api.orders.getAll();
      setOrders(ordersData);

      // Загружаем информацию о продуктах для всех заказов
      const productIds = new Set<number>();
      ordersData.forEach(order => {
        order.items.forEach(item => {
          productIds.add(item.product_id);
        });
      });

      // Получаем информацию о продуктах одним запросом
      if (productIds.size > 0) {
        try {
          const response = await api.products.getAll({ page_size: 1000 });
          const map = new Map<number, Product>();
          response.items.forEach((product: Product) => {
            if (productIds.has(product.id)) {
              map.set(product.id, product);
            }
          });
          setProductsMap(map);
        } catch (error) {
          console.error('Failed to load products:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      pending: { label: 'В обработке', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' },
      paid: { label: 'Оплачен', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      shipped: { label: 'Отправлен', icon: <Package className="h-4 w-4" />, color: 'text-blue-600' },
      delivered: { label: 'Доставлен', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      canceled: { label: 'Отменен', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' },
    };
    return statusMap[status] || { label: status, icon: <Clock className="h-4 w-4" />, color: 'text-gray-600' };
  };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-10">
          <h1 className="text-4xl font-bold mb-8">Личный кабинет</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info */}
            <Card className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                  {user?.role === 'admin' ? (
                    <Shield className="h-8 w-8 text-primary-foreground" />
                  ) : (
                    <User className="h-8 w-8 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{user?.email}</h2>
                  <p className="text-sm text-muted-foreground">
                    {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  </p>
                </div>
              </div>
              {user?.role === 'admin' && (
                <Link href="/admin" className="block mb-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Shield className="h-4 w-4 mr-2" />
                    Админ панель
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="w-full" onClick={logout}>
                Выйти
              </Button>
            </Card>

            {/* Favorites */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                <h3 className="text-lg font-semibold">Избранное</h3>
                <span className="ml-auto text-sm text-muted-foreground">
                  {favorites.length}
                </span>
              </div>
              {favorites.length === 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Товары, которые вы добавили в избранное, появятся здесь
                  </p>
                  <Link href="/shop">
                    <Button variant="outline" className="w-full">
                      Перейти в каталог
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {favorites.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      {item.images?.[0] && (
                        <div className="w-16 h-16 relative rounded overflow-hidden bg-muted shrink-0">
                          <Image
                            src={item.images[0]}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/shop/${item.slug}`}>
                          <h4 className="font-medium text-sm hover:text-primary truncate">
                            {item.title}
                          </h4>
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFavorite(item.id)}
                        className="h-8 w-8 shrink-0"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Orders */}
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Package className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Заказы</h3>
                <span className="ml-auto text-sm text-muted-foreground">
                  {orders.length}
                </span>
              </div>
              {ordersLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : orders.length === 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    У вас пока нет заказов
                  </p>
                  <Link href="/shop">
                    <Button variant="outline" className="w-full">
                      Перейти в каталог
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {orders.slice(0, 5).map((order) => {
                    const status = getStatusLabel(order.status);
                    return (
                      <div key={order.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {status.icon}
                            <span className={`text-sm font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatPrice(order.amount_cents)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.items.length} {order.items.length === 1 ? 'товар' : 'товаров'}
                        </div>
                      </div>
                    );
                  })}
                  {orders.length > 5 && (
                    <Link href="/account#orders">
                      <Button variant="outline" className="w-full text-sm">
                        Показать все заказы ({orders.length})
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Orders History - Full List */}
          <Card className="p-6 mt-6" id="orders">
            <div className="flex items-center space-x-2 mb-6">
              <Package className="h-5 w-5" />
              <h2 className="text-2xl font-semibold">История заказов</h2>
            </div>
            {ordersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">У вас пока нет заказов</p>
                <Link href="/shop">
                  <Button>Перейти в каталог</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const status = getStatusLabel(order.status);
                  return (
                    <div key={order.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            {status.icon}
                            <span className={`font-semibold ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Заказ #{order.id} от {formatDate(order.created_at)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatPrice(order.amount_cents)}</div>
                          <div className="text-sm text-muted-foreground">{order.currency}</div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Товары:</h4>
                        <div className="space-y-2">
                          {order.items.map((item, index) => {
                            const product = productsMap.get(item.product_id);
                            return (
                              <div key={index} className="flex items-center space-x-3">
                                {product?.images?.[0] && (
                                  <div className="w-12 h-12 relative rounded overflow-hidden bg-muted shrink-0">
                                    <Image
                                      src={product.images[0]}
                                      alt={product.title}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {product?.title || `Товар #${item.product_id}`}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.quantity} шт. × {formatPrice(item.price_cents)}
                                  </div>
                                </div>
                                <div className="font-medium">
                                  {formatPrice(item.price_cents * item.quantity)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-medium mb-2 flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>Адрес доставки:</span>
                          </h4>
                          <div className="text-sm text-muted-foreground">
                            {typeof order.shipping_address === 'object' && (
                              <pre className="whitespace-pre-wrap font-sans">
                                {JSON.stringify(order.shipping_address, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}

                      {order.payment_id && (
                        <div className="border-t pt-4 mt-4">
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">ID платежа:</span> {order.payment_id}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Address Info */}
          <Card className="p-6 mt-6">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Адреса доставки</h3>
            </div>
            <p className="text-muted-foreground">
              Сохраненные адреса для быстрого оформления заказа
            </p>
            <Button variant="outline" className="mt-4" disabled>
              Добавить адрес
            </Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-10 max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          {isLogin ? 'Вход' : 'Регистрация'}
        </h1>

        <Card className="p-6">
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
              }}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? 'Нет аккаунта? Зарегистрироваться'
                : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function AccountPage() {
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
      <AccountPageContent />
    </Suspense>
  );
}

