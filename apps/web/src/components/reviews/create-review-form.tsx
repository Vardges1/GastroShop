'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { StarRatingInput } from './star-rating'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'

interface CreateReviewFormProps {
  productId: number
  productTitle?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function CreateReviewForm({
  productId,
  productTitle,
  onSuccess,
  onCancel,
}: CreateReviewFormProps) {
  const { toast } = useToast()
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, напишите отзыв',
        variant: 'destructive',
      })
      return
    }

    if (rating < 1 || rating > 5) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите оценку',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      await api.reviews.create({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        photos: photos.length > 0 ? photos : undefined,
      })

      toast({
        title: 'Успешно',
        description: 'Ваш отзыв отправлен на модерацию',
      })

      // Reset form
      setRating(5)
      setTitle('')
      setComment('')
      setPhotos([])
      
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось создать отзыв',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // For now, we'll just store file paths
    // In production, you'd upload to a storage service first
    const newPhotos: string[] = []
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (reader.result) {
          newPhotos.push(reader.result as string)
          setPhotos((prev) => [...prev, ...newPhotos])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Написать отзыв</h3>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {productTitle && (
        <p className="text-sm text-muted-foreground">Товар: {productTitle}</p>
      )}

      {/* Rating */}
      <div className="space-y-2">
        <Label>Оценка</Label>
        <StarRatingInput value={rating} onChange={setRating} />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="review-title">Заголовок (необязательно)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Краткое описание вашего опыта"
          maxLength={255}
        />
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="review-comment">
          Отзыв <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Поделитесь своими впечатлениями о товаре"
          rows={6}
          required
        />
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <Label>Фотографии (необязательно)</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoChange}
          className="cursor-pointer"
        />
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
        </Button>
      </div>
    </form>
  )
}










