'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  showValue?: boolean
  className?: string
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 20,
  showValue = false,
  className 
}: StarRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star
          key={`full-${i}`}
          className="h-5 w-5 fill-yellow-400 text-yellow-400"
          size={size}
        />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star
            className="h-5 w-5 text-gray-300"
            size={size}
          />
          <Star
            className="absolute inset-0 h-5 w-5 fill-yellow-400 text-yellow-400"
            size={size}
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          />
        </div>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star
          key={`empty-${i}`}
          className="h-5 w-5 text-gray-300"
          size={size}
        />
      ))}
      {showValue && (
        <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
      )}
    </div>
  )
}

interface StarRatingInputProps {
  value: number
  onChange: (rating: number) => void
  maxRating?: number
  size?: number
  className?: string
}

export function StarRatingInput({
  value,
  onChange,
  maxRating = 5,
  size = 24,
  className
}: StarRatingInputProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const starValue = i + 1
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            className="focus:outline-none transition-transform hover:scale-110"
            aria-label={`Rate ${starValue} out of ${maxRating}`}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                starValue <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-200'
              )}
              size={size}
            />
          </button>
        )
      })}
    </div>
  )
}










