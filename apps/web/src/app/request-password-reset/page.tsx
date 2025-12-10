'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function RequestPasswordResetPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Если такой email зарегистрирован, вы получите письмо с инструкциями по восстановлению пароля.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Ошибка запроса сброса пароля');
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
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </button>
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-center">Восстановление пароля</h1>
              <p className="text-gray-600 text-center text-sm">
                Введите ваш email, и мы отправим вам ссылку для восстановления пароля
              </p>
            </div>

            {status === 'success' ? (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="space-y-3">
                  <Button onClick={() => router.push('/account')} className="w-full">
                    Вернуться к входу
                  </Button>
                  <p className="text-xs text-gray-500">
                    Не получили письмо? Проверьте папку "Спам" или{' '}
                    <button
                      onClick={() => {
                        setStatus('idle');
                        setMessage('');
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      попробуйте снова
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email адрес
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                  />
                </div>

                {status === 'error' && message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {message}
                  </div>
                )}

                <Button type="submit" disabled={status === 'loading'} className="w-full">
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    'Отправить ссылку'
                  )}
                </Button>

                <div className="text-center pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => router.push('/account')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Вспомнили пароль? Войти
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}










