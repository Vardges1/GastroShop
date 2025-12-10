"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const checkoutSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  notes: z.string().optional(),
  saveAddress: z.boolean().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export function CheckoutForm() {
  const t = useTranslations('checkout.form')
  const tError = useTranslations('checkout.error')
  const items = useCartStore((state) => state.items)
  const getTotalPrice = useCartStore((state) => state.getTotalPrice)
  const clearCart = useCartStore((state) => state.clearCart)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  })

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create order
      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_cents: item.product.price_cents,
        })),
        shipping_address: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          notes: data.notes,
        },
      }

      const order = await api.orders.create(orderData)

      // Create payment
      const payment = await api.payments.create(order.id)

      // Store payment ID for status checking
      localStorage.setItem('current_payment_id', payment.payment_id)
      localStorage.setItem('current_order_id', order.id.toString())

      // Clear cart
      clearCart()

      // Redirect to payment
      window.location.href = payment.payment_url

    } catch (error) {
      console.error('Payment creation error:', error)
      toast({
        title: "Payment Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contact')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="text-sm font-medium">
                {t('firstName')}
              </label>
              <Input
                id="firstName"
                {...register('firstName')}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">
                {t('lastName')}
              </label>
              <Input
                id="lastName"
                {...register('lastName')}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                {t('email')}
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="phone" className="text-sm font-medium">
                {t('phone')}
              </label>
              <Input
                id="phone"
                {...register('phone')}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>{t('shipping')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="address" className="text-sm font-medium">
              {t('address')}
            </label>
            <Input
              id="address"
              {...register('address')}
              className={errors.address ? 'border-destructive' : ''}
            />
            {errors.address && (
              <p className="text-sm text-destructive mt-1">
                {errors.address.message}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="text-sm font-medium">
                {t('city')}
              </label>
              <Input
                id="city"
                {...register('city')}
                className={errors.city ? 'border-destructive' : ''}
              />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">
                  {errors.city.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="postalCode" className="text-sm font-medium">
                {t('postalCode')}
              </label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                className={errors.postalCode ? 'border-destructive' : ''}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive mt-1">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="country" className="text-sm font-medium">
                {t('country')}
              </label>
              <Input
                id="country"
                {...register('country')}
                className={errors.country ? 'border-destructive' : ''}
              />
              {errors.country && (
                <p className="text-sm text-destructive mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <label htmlFor="notes" className="text-sm font-medium">
              {t('notes')}
            </label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Any special instructions..."
            />
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center space-x-2">
              <Checkbox id="saveAddress" {...register('saveAddress')} />
              <label htmlFor="saveAddress" className="text-sm">
                Save this address for future orders
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Complete Order'
        )}
      </Button>
    </form>
  )
}
