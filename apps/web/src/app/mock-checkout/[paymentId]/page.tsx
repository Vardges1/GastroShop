'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function MockCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const paymentId = params.paymentId as string;
  const [status, setStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [paymentData, setPaymentData] = useState<any>(null);
  const orderId = localStorage.getItem('current_order_id');

  useEffect(() => {
    if (paymentId) {
      loadPaymentStatus();
    }
  }, [paymentId]);

  const loadPaymentStatus = async () => {
    try {
      const paymentStatus = await api.payments.getStatus(paymentId);
      setPaymentData(paymentStatus);
      
      if (paymentStatus.status === 'paid' || paymentStatus.status === 'succeeded') {
        setStatus('success');
      } else if (paymentStatus.status === 'canceled' || paymentStatus.status === 'failed') {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса платежа:', error);
    }
  };

  const handlePay = async () => {
    setStatus('processing');
    
    try {
      // Вызываем API для завершения тестового платежа
      const data = await api.payments.mockComplete(paymentId);
      
      setStatus('success');
      
      toast({
        title: "Оплата успешна!",
        description: "Ваш заказ успешно оплачен",
      });

      // Перенаправляем на страницу успеха через 2 секунды
      setTimeout(() => {
        router.push(`/checkout/success?order_id=${data.order_id || orderId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Ошибка оплаты:', error);
      setStatus('failed');
      toast({
        title: "Ошибка оплаты",
        description: error.message || "Не удалось обработать платеж",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setStatus('failed');
    router.push('/checkout');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-10 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Тестовая оплата</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === 'pending' && (
              <>
                <div className="text-center space-y-4">
                  <p className="text-lg">ID платежа: {paymentId}</p>
                  {orderId && <p className="text-sm text-muted-foreground">Заказ №{orderId}</p>}
                  {paymentData && (
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">
                        {paymentData.amount?.value || '0.00'} {paymentData.amount?.currency || 'RUB'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <Button onClick={handlePay} className="flex-1" size="lg">
                    Оплатить (Тест)
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1" size="lg">
                    Отменить
                  </Button>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Это тестовая страница оплаты. Нажмите "Оплатить" для имитации успешной оплаты.
                </p>
              </>
            )}

            {status === 'processing' && (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <p className="text-lg">Обработка платежа...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <p className="text-lg font-semibold text-green-500">Оплата успешна!</p>
                <p className="text-sm text-muted-foreground">
                  Перенаправление на страницу подтверждения...
                </p>
              </div>
            )}

            {status === 'failed' && (
              <div className="text-center space-y-4">
                <XCircle className="h-12 w-12 mx-auto text-red-500" />
                <p className="text-lg font-semibold text-red-500">Оплата отменена</p>
                <Button onClick={() => router.push('/checkout')} className="w-full">
                  Вернуться к оформлению заказа
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
