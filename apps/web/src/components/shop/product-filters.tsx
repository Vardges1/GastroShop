"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { X } from 'lucide-react'

const regions = [
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'DE', name: 'Germany' },
]

const categories = [
  { 
    id: 'cheese', 
    name: 'Сыры', 
    tags: ['cheese'] 
  },
  { 
    id: 'deli', 
    name: 'Мясные деликатесы', 
    tags: ['ham', 'cured', 'charcuterie'] 
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
]

const tags = [
  'soft', 'hard', 'aged', 'fresh', 'creamy', 'nutty', 'salty', 'sweet',
  'fruity', 'earthy', 'grated', 'melted', 'cured', 'blue', 'sheep', 'cow'
]

export function ProductFilters() {
  const t = useTranslations('shop.filters')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    searchParams.getAll('region')
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.getAll('tag')
  )
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.getAll('category')
  )
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get('inStock') === 'true'
  )

  const updateFilters = () => {
    const params = new URLSearchParams(searchParams)
    
    // Clear existing filters
    params.delete('region')
    params.delete('tag')
    params.delete('category')
    params.delete('inStock')
    params.delete('priceMin')
    params.delete('priceMax')
    params.delete('page')
    
    // Add new filters
    selectedRegions.forEach(region => params.append('region', region))
    selectedTags.forEach(tag => params.append('tag', tag))
    selectedCategories.forEach(category => params.append('category', category))
    if (inStockOnly) params.set('inStock', 'true')
    if (priceRange[0] > 0) params.set('priceMin', priceRange[0].toString())
    if (priceRange[1] < 1000) params.set('priceMax', priceRange[1].toString())
    
    router.push(`/shop?${params.toString()}`)
  }

  const clearFilters = () => {
    setSelectedRegions([])
    setSelectedTags([])
    setSelectedCategories([])
    setInStockOnly(false)
    setPriceRange([0, 1000])
    router.push('/shop')
  }
  
  const toggleCategory = (categoryId: string) => {
    const isSelected = selectedCategories.includes(categoryId)
    const newCategories = isSelected
      ? selectedCategories.filter(c => c !== categoryId)
      : [...selectedCategories, categoryId]
    
    // Автоматически добавляем/удаляем связанные теги при выборе/снятии категории
    const category = categories.find(c => c.id === categoryId)
    let newTags = [...selectedTags]
    
    if (category) {
      if (isSelected) {
        // Удаляем теги категории, если категория снята
        const tagsToRemove = category.tags
        newTags = newTags.filter(tag => !tagsToRemove.includes(tag))
        
        // Проверяем, используются ли эти теги другими категориями
        newCategories.forEach(catId => {
          const cat = categories.find(c => c.id === catId)
          if (cat) {
            cat.tags.forEach(tag => {
              if (!newTags.includes(tag)) {
                newTags.push(tag)
              }
            })
          }
        })
      } else {
        // Добавляем теги категории, если категория выбрана
        category.tags.forEach(tag => {
          if (!newTags.includes(tag)) {
            newTags.push(tag)
          }
        })
      }
    }
    
    setSelectedCategories(newCategories)
    setSelectedTags(newTags)
    
    // Автоматически применяем фильтры
    const params = new URLSearchParams(searchParams)
    params.delete('region')
    params.delete('tag')
    params.delete('category')
    params.delete('inStock')
    params.delete('priceMin')
    params.delete('priceMax')
    params.delete('page')
    
    selectedRegions.forEach(region => params.append('region', region))
    newTags.forEach(tag => params.append('tag', tag))
    newCategories.forEach(cat => params.append('category', cat))
    if (inStockOnly) params.set('inStock', 'true')
    if (priceRange[0] > 0) params.set('priceMin', priceRange[0].toString())
    if (priceRange[1] < 1000) params.set('priceMax', priceRange[1].toString())
    
    router.push(`/shop?${params.toString()}`)
  }
  
  const removeCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    setSelectedCategories(prev => prev.filter(c => c !== categoryId))
    
    if (category) {
      setSelectedTags(prevTags => {
        const tagsToRemove = category.tags
        let newTags = prevTags.filter(tag => !tagsToRemove.includes(tag))
        
        // Проверяем, используются ли эти теги другими выбранными категориями
        const remainingCategories = selectedCategories.filter(c => c !== categoryId)
        remainingCategories.forEach(catId => {
          const cat = categories.find(c => c.id === catId)
          if (cat) {
            cat.tags.forEach(tag => {
              if (!newTags.includes(tag)) {
                newTags.push(tag)
              }
            })
          }
        })
        
        return newTags
      })
    }
    
    // Обновляем фильтры немедленно
    setTimeout(() => {
      updateFilters()
    }, 0)
  }

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const removeRegion = (region: string) => {
    setSelectedRegions(prev => prev.filter(r => r !== region))
  }

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('title')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t('clear')}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <h3 className="font-medium">{t('price')}</h3>
          <div className="space-y-2">
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={1000}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>
        </div>

        {/* In Stock Only */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="inStock"
            checked={inStockOnly}
            onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
          />
          <label htmlFor="inStock" className="text-sm font-medium">
            {t('inStock')}
          </label>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="font-medium">Категории</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
                <label htmlFor={`category-${category.id}`} className="text-sm">
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Regions */}
        <div className="space-y-3">
          <h3 className="font-medium">{t('region')}</h3>
          <div className="space-y-2">
            {regions.map((region) => (
              <div key={region.code} className="flex items-center space-x-2">
                <Checkbox
                  id={`region-${region.code}`}
                  checked={selectedRegions.includes(region.code)}
                  onCheckedChange={() => toggleRegion(region.code)}
                />
                <label htmlFor={`region-${region.code}`} className="text-sm">
                  {region.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <h3 className="font-medium">{t('tags')}</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleTag(tag)}
                className="text-xs"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Selected Filters */}
        {(selectedRegions.length > 0 || selectedTags.length > 0 || selectedCategories.length > 0 || inStockOnly) && (
          <div className="space-y-3">
            <h3 className="font-medium">Active Filters</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((categoryId) => {
                const category = categories.find(c => c.id === categoryId)
                return (
                  <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                    {category?.name || categoryId}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeCategory(categoryId)}
                    />
                  </Badge>
                )
              })}
              {selectedRegions.map((region) => (
                <Badge key={region} variant="secondary" className="flex items-center gap-1">
                  {region}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeRegion(region)}
                  />
                </Badge>
              ))}
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
              {inStockOnly && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  In Stock
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setInStockOnly(false)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        <Button onClick={updateFilters} className="w-full">
          Apply Filters
        </Button>
      </CardContent>
    </Card>
  )
}
