'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { Review } from '@/types'
import { StarRating } from './star-rating'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { 
  ThumbsUp, 
  Edit2, 
  Trash2, 
  CheckCircle,
  XCircle
} from 'lucide-react'
import Image from 'next/image'

interface ReviewItemProps {
  review: Review
  currentUserId?: number
  onUpdate?: () => void
  onDelete?: () => void
  onToggleHelpful?: (reviewId: number) => void
}

export function ReviewItem({
  review,
  currentUserId,
  onUpdate,
  onDelete,
  onToggleHelpful,
}: ReviewItemProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const isOwner = currentUserId === review.user_id
  const canModify = isOwner && !review.moderated

  const handleToggleHelpful = async () => {
    if (!onToggleHelpful) return
    try {
      await onToggleHelpful(review.id)
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить оценку',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await api.reviews.delete(review.id)
      toast({
        title: 'Успешно',
        description: 'Отзыв удален',
      })
      setShowDeleteDialog(false)
      onDelete?.()
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.error || 'Не удалось удалить отзыв',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ru,
      })
    } catch {
      return dateString
    }
  }

  return (
    <>
      <div className="border rounded-lg p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
              {review.user_email ? getInitials(review.user_email) : 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">
                  {review.user_name || review.user_email?.split('@')[0] || 'Анонимный пользователь'}
                </div>
                {review.approved && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {review.moderated && !review.approved && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(review.created_at)}
              </div>
            </div>
          </div>
          {canModify && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onUpdate}
                className="h-8"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Rating */}
        <StarRating rating={review.rating} />

        {/* Title */}
        {review.title && (
          <h4 className="font-semibold text-lg">{review.title}</h4>
        )}

        {/* Comment */}
        <p className="text-muted-foreground whitespace-pre-wrap">
          {review.comment}
        </p>

        {/* Photos */}
        {review.photos && review.photos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {review.photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <Image
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleHelpful}
            disabled={isOwner || !onToggleHelpful}
            className={review.is_helpful ? 'text-primary' : ''}
          >
            <ThumbsUp
              className={cn(
                'h-4 w-4 mr-2',
                review.is_helpful && 'fill-primary text-primary'
              )}
            />
            Полезно {review.helpful_count > 0 && `(${review.helpful_count})`}
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold">Удалить отзыв?</h3>
            <p className="text-muted-foreground">
              Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

