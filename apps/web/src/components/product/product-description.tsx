"use client"

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, Award } from 'lucide-react'
import type { Product } from '@/types'

interface ProductDescriptionProps {
  product: Product
}

export function ProductDescription({ product }: ProductDescriptionProps) {
  const t = useTranslations('product')

  return (
    <div className="space-y-8">
      {/* Detailed Description */}
      <Card>
        <CardHeader>
          <CardTitle>{t('description')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Tasting Notes</h4>
                <p className="text-sm text-muted-foreground">
                  This exceptional product offers a complex flavor profile with notes of 
                  {product.tags.slice(0, 3).join(', ')}. Perfect for pairing with wine, 
                  charcuterie, or enjoying on its own.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Storage Instructions</h4>
                <p className="text-sm text-muted-foreground">
                  Store in a cool, dry place. For best results, bring to room temperature 
                  before serving. Consume within 7 days of opening.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              {t('origin')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Region</span>
                <Badge variant="outline">{product.region_code}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Producer</span>
                <span className="text-sm font-medium">Artisanal</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Age & Maturation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Maturation</span>
                <span className="text-sm font-medium">Traditional</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm font-medium">
                  {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Grade</span>
                <span className="text-sm font-medium">Premium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Certification</span>
                <span className="text-sm font-medium">AOP/DOP</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tags')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
