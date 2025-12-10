'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { MapView } from '@/components/map/map-view';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

function MapPageContent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <MapView />
      </main>
      <Footer />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка карты...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
