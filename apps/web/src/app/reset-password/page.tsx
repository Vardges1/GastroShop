'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен сброса пароля не найден');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus('error');
      setMessage('Токен сброса пароля не найден');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Пароль должен содержать не менее 8 символов');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Пароли не совпадают');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Пароль успешно изменен!');
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/account');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Ошибка сброса пароля');
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
            <h1 className="text-2xl font-bold mb-6 text-center">Восстановление пароля</h1>

            {status === 'success' && (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <p className="text-gray-600 mb-6">{message}</p>
                <p className="text-sm text-gray-500">Вы будете перенаправлены на страницу входа...</p>
              </div>
            )}

            {status !== 'success' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Новый пароль
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 8 символов"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Пароль должен содержать буквы и цифры, минимум 8 символов
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Подтвердите пароль
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    required
                  />
                </div>

                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={status === 'loading' || !token}
                  className="w-full"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Изменение пароля...
                    </>
                  ) : (
                    'Изменить пароль'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push('/account')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Вернуться к входу
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










