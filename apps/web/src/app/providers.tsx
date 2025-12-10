'use client';

import { ReactNode, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

const messages = {
  en: enMessages as any,
  ru: ruMessages as any,
};

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const locale = 'ru'; // You can make this dynamic based on user preference

  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}