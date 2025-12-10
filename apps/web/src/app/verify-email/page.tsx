'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен подтверждения не найден');
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Email успешно подтвержден!');
        // Redirect to account page after 3 seconds
        setTimeout(() => {
          router.push('/account');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Ошибка подтверждения email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Ошибка подключения к серверу');
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
                <h1 className="text-2xl font-bold mb-4">Подтверждение email</h1>
                <p className="text-gray-600">Пожалуйста, подождите...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h1 className="text-2xl font-bold mb-4 text-green-600">Email подтвержден!</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <p className="text-sm text-gray-500">Вы будете перенаправлены на страницу аккаунта...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                <h1 className="text-2xl font-bold mb-4 text-red-600">Ошибка</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="space-y-3">
                  <Button onClick={() => router.push('/account')} className="w-full">
                    Перейти в аккаунт
                  </Button>
                  <Button onClick={verifyEmail} variant="outline" className="w-full">
                    Попробовать снова
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}










