import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MapPin, Mail, Phone, Instagram, Twitter, Facebook } from 'lucide-react'

export function Footer() {
  const t = useTranslations()

  return (
    <footer className="border-t bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-primary" />
              <span className="text-xl font-bold">GastroShop</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Исключительные сыры и деликатесы со всей Европы. 
              Отобранные экспертами, доставленные с заботой.
            </p>
            <div className="flex space-x-4">
              <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
              <Facebook className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('navigation.shop')}
              </Link>
              <Link href="/map" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('navigation.map')}
              </Link>
              <Link href="/assistant" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('navigation.assistant')}
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('common.about')}
              </Link>
            </nav>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Customer Service</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/shipping-returns" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('common.shipping')} & {t('common.returns')}
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('common.contact')}
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('common.privacy')}
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('common.terms')}
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <a 
                  href="https://maps.google.com/maps?q=Moscow+Russia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  123 Gastronomy Street<br />
                  Moscow, Russia 101000
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a 
                  href="mailto:hello@gastroshop.com"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  hello@gastroshop.com
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a 
                  href="tel:+74951234567"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  +7 (495) 123-45-67
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2025 GastroShop. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Made with ❤️ for food lovers
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
