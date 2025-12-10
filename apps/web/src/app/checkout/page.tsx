'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart, formatPrice } from '@/store/cart';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingCart } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, clear, totalCents: getTotalCents } = useCart();
  const { isAuthenticated } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Россия',
    notes: ''
  });
  
  // Ждем гидратации zustand store (загрузка из localStorage)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Перенаправляем если корзина пуста
  useEffect(() => {
    if (isHydrated && items.length === 0) {
      toast({
        title: "Корзина пуста",
        description: "Добавьте товары в корзину перед оформлением заказа",
        variant: "destructive",
      });
      router.push('/cart');
    }
  }, [isHydrated, items.length, router, toast]);
  
  const totalCents = getTotalCents();
  
  // Загружаем информацию о продуктах для заказа
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Извлекаем уникальные slug из id (формат: "slug-volume" или просто "slug")
        const uniqueSlugs = new Set<string>();
        items.forEach(item => {
          // Если id содержит дефисы, возможно это "slug-volume", пробуем разные варианты
          // Сначала пробуем весь id как slug
          uniqueSlugs.add(item.id);
          
          // Если есть дефисы, пробуем без последней части
          const parts = item.id.split('-');
          if (parts.length > 1) {
            // Пробуем все варианты без последних частей
            for (let i = parts.length - 1; i > 0; i--) {
              uniqueSlugs.add(parts.slice(0, i).join('-'));
            }
          }
        });
        
        // Загружаем информацию о продуктах
        const productPromises = Array.from(uniqueSlugs).map(async (slug) => {
          try {
            const product = await api.products.getBySlug(slug);
            return product;
          } catch (error) {
            // Игнорируем ошибки для несуществующих slug
            return null;
          }
        });
        
        const loadedProducts = await Promise.all(productPromises);
        setProducts(loadedProducts.filter(p => p !== null));
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    
    if (items.length > 0 && isHydrated) {
      loadProducts();
    }
  }, [items, isHydrated]);
  
  // Показываем загрузку пока не загрузилась корзина
  if (!isHydrated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-10 max-w-5xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Если корзина пуста, показываем сообщение
  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-10 max-w-5xl">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Ваша корзина пуста</h2>
            <p className="text-muted-foreground">Добавьте товары в корзину перед оформлением заказа</p>
            <Link href="/shop">
              <Button>Перейти в каталог</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Предотвращаем повторную отправку
    if (isSubmitting) {
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: "Ошибка",
        description: "Ваша корзина пуста",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Пожалуйста, войдите в систему для оформления заказа",
        variant: "destructive",
      });
      router.push('/account');
      return;
    }
    
    // Проверяем что продукты загружены
    if (products.length === 0 || products.length < items.length) {
      toast({
        title: "Загрузка данных",
        description: "Пожалуйста, подождите, загружаются данные о продуктах...",
        variant: "default",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Создаем заказ
      // Сопоставляем items корзины с загруженными продуктами
      const orderItems = items.map(item => {
        // Пробуем найти продукт по разным вариантам slug
        let product = products.find(p => p.slug === item.id);
        
        if (!product) {
          // Пробуем без последней части (если это "slug-volume")
          const parts = item.id.split('-');
          for (let i = parts.length - 1; i > 0; i--) {
            const slug = parts.slice(0, i).join('-');
            product = products.find(p => p.slug === slug);
            if (product) break;
          }
        }
        
        if (!product) {
          // Если не нашли по slug, пробуем загрузить напрямую
          throw new Error(`Product not found for item: ${item.id}. Please refresh the page and try again.`);
        }
        
        return {
          product_id: product.id,
          quantity: item.qty,
          price_cents: item.priceCents,
        };
      });
      
      const orderData = {
        items: orderItems,
        shipping_address: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          notes: formData.notes,
        },
      };

      const order = await api.orders.create(orderData);
      console.log('Order created:', order);

      // Создаем платеж
      let payment;
      try {
        payment = await api.payments.create(order.id);
        console.log('Payment created:', payment);
      } catch (paymentError: any) {
        console.error('Payment creation error:', paymentError);
        // Если платеж не создался, перенаправляем на страницу успеха с информацией о заказе
        toast({
          title: "Заказ создан",
          description: paymentError.response?.data?.error || "Заказ создан, но произошла ошибка при создании платежа. Вы можете оплатить заказ позже.",
          variant: "default",
        });
        // Очищаем корзину
        clear();
        // Перенаправляем на страницу успеха
        router.push(`/checkout/success?order_id=${order.id}`);
        return;
      }

      // Сохраняем ID платежа и заказа
      localStorage.setItem('current_payment_id', payment.payment_id);
      localStorage.setItem('current_order_id', order.id.toString());

      // Очищаем корзину
      clear();

      // Перенаправляем на страницу оплаты или успеха
      const paymentUrl = payment.payment_url || (payment as any).checkout_url;
      if (paymentUrl && paymentUrl !== '') {
        // Перенаправляем на страницу оплаты
        window.location.href = paymentUrl;
      } else {
        // Если нет URL оплаты, перенаправляем на страницу успеха
        toast({
          title: "Заказ создан",
          description: "Заказ успешно создан. Перейдите на страницу заказа для оплаты.",
        });
        router.push(`/checkout/success?order_id=${order.id}`);
      }
    } catch (error: any) {
      console.error('Ошибка создания заказа:', error);
      toast({
        title: "Ошибка",
        description: error.response?.data?.error || "Не удалось создать заказ. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-10 max-w-5xl">
        <Link href="/cart" className="text-sm underline underline-offset-4">← Вернуться в корзину</Link>
        <h1 className="mt-4 text-3xl font-medium">Оформление заказа</h1>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Контактная информация</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Имя *</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Фамилия *</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input type="email" id="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="phone">Телефон *</Label>
                  <Input type="tel" id="phone" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Адрес доставки</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Адрес *</Label>
                  <Input id="address" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Город *</Label>
                    <Input id="city" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Индекс *</Label>
                    <Input id="postalCode" required value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Страна *</Label>
                  <Input id="country" required value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="notes">Дополнительные комментарии</Label>
                  <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isSubmitting || products.length === 0 || items.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Оформление заказа...
                </>
              ) : (
                'Оформить заказ'
              )}
            </Button>
          </form>

          {/* Order Summary */}
          <div className="border rounded-lg p-6 h-fit sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Ваш заказ</h2>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.title} × {item.qty}
                  </span>
                  <span>{formatPrice(item.priceCents * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Доставка</span>
                <span className="text-muted-foreground">Рассчитывается отдельно</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2">
                <span>Итого</span>
                <span>{formatPrice(totalCents)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
