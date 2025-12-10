"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Mail } from 'lucide-react'

export function Newsletter() {
  const t = useTranslations('home.newsletter')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: t('success.title'),
        description: t('success.description'),
      })
      setEmail('')
    } catch (error) {
      toast({
        title: t('error.title'),
        description: t('error.description'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="section-padding bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('title')}
            </h2>
            <p className="text-lg opacity-90">
              {t('subtitle')}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-background text-foreground"
                required
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              variant="secondary"
              disabled={isLoading}
              className="px-8"
            >
              {isLoading ? t('subscribing') : t('cta')}
            </Button>
          </form>
          
          <p className="text-sm opacity-75">
            {t('privacy')}
          </p>
        </div>
      </div>
    </section>
  )
}
