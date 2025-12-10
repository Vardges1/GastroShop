"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { MessageCircle, X } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { AssistantChat } from './assistant-chat'

export function AssistantWidget() {
  const t = useTranslations('assistant')
  const isAssistantOpen = useUIStore((state) => state.isAssistantOpen)
  const toggleAssistant = useUIStore((state) => state.toggleAssistant)

  if (!isAssistantOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggleAssistant}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">{t('title')}</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-background border rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t('title')}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAssistant}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <AssistantChat />
      </div>
    </div>
  )
}
