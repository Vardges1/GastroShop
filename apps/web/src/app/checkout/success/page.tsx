"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Package, Home, AlertCircle, Loader2, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Order } from '@/types'

type PaymentStatus = 'pending' | 'succeeded' | 'canceled' | 'failed' | 'unknown'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [isCheckingPayment, setIsCheckingPayment] = useState(true)
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    if (orderId) {
      const fetchOrderAndPaymentStatus = async () => {
        try {
          // Fetch order
          const orderData = await api.orders.getById(parseInt(orderId))
          setOrder(orderData)

          // Check payment status if we have payment ID
          const paymentId = localStorage.getItem('current_payment_id')
          if (paymentId) {
            try {
              const status = await api.payments.getStatus(paymentId)
              setPaymentStatus(status.status as PaymentStatus)
            } catch (error) {
              console.error('Failed to check payment status:', error)
              setPaymentStatus('unknown')
            }
          }
        } catch (error) {
          console.error('Failed to fetch order:', error)
        } finally {
          setIsCheckingPayment(false)
        }
      }
      fetchOrderAndPaymentStatus()
    } else {
      setIsCheckingPayment(false)
    }
  }, [orderId])

  if (isCheckingPayment) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-16">
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-center text-muted-foreground">Проверяем статус платежа...</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-16">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Заказ не найден</h2>
                <p className="text-muted-foreground mb-4">
                  Возможно, произошла ошибка или заказ был удален
                </p>
                <Button asChild>
                  <Link href="/">На главную</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }
  
  // Получаем URL оплаты из localStorage
  const paymentId = localStorage.getItem('current_payment_id');
  const paymentUrl = paymentId ? `/mock-checkout/${paymentId}` : null;

  const isPaymentSuccessful = paymentStatus === 'succeeded'
  const isPaymentFailed = paymentStatus === 'canceled' || paymentStatus === 'failed'

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-16">
        <div className="max-w-2xl mx-auto space-y-6">
        <Card className={isPaymentSuccessful ? "border-green-500" : isPaymentFailed ? "border-red-500" : "border-yellow-500"}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${
                isPaymentSuccessful ? "bg-green-100" : 
                isPaymentFailed ? "bg-red-100" : "bg-yellow-100"
              }`}>
                {isPaymentSuccessful ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : isPaymentFailed ? (
                  <AlertCircle className="h-16 w-16 text-red-500" />
                ) : (
                  <Package className="h-16 w-16 text-yellow-500" />
                )}
              </div>
            </div>
            <CardTitle className="text-3xl">
              {isPaymentSuccessful ? "Заказ успешно оплачен!" : 
               isPaymentFailed ? "Платеж не прошел" : 
               "Заказ создан, ожидаем оплату"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Номер заказа: #{order.id}</p>
              <p className="text-muted-foreground">
                {isPaymentSuccessful ? "Мы отправили подтверждение на вашу почту" :
                 isPaymentFailed ? "Попробуйте оплатить заказ еще раз" :
                 "Перейдите к оплате для завершения заказа"}
              </p>
            </div>

            {!isPaymentSuccessful && !isPaymentFailed && paymentUrl && (
              <div className="border-t pt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">Завершите оплату</h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Для завершения заказа необходимо произвести оплату. Нажмите на кнопку ниже для перехода к оплате.
                      </p>
                      <Button asChild className="w-full">
                        <Link href={paymentUrl}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Перейти к оплате
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isPaymentSuccessful && (
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Package className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">Что дальше?</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Мы обработаем ваш заказ в течение 1-2 часов</li>
                      <li>• Вы получите уведомление о готовности к отправке</li>
                      <li>• Доставка займет 3-5 рабочих дней</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button asChild className="flex-1">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  На главную
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/shop">
                  Продолжить покупки
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Детали заказа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Дата заказа:</span>
                <span>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Сумма:</span>
                <span className="font-semibold">{order.amount_cents / 100} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Статус платежа:</span>
                <span className={`font-semibold ${
                  isPaymentSuccessful ? "text-green-600" :
                  isPaymentFailed ? "text-red-600" : "text-yellow-600"
                }`}>
                  {paymentStatus === 'succeeded' ? 'Оплачен' :
                   paymentStatus === 'canceled' ? 'Отменен' :
                   paymentStatus === 'failed' ? 'Не прошел' :
                   'Ожидает оплаты'}
                </span>
              </div>
              {order.shipping_address && (
                <div className="border-t pt-4 mt-4">
                  <p className="font-semibold mb-2">Адрес доставки:</p>
                  <p className="text-sm text-muted-foreground">
                    {order.shipping_address.address}, {order.shipping_address.city}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container py-16">
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-center text-muted-foreground">Загрузка...</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}