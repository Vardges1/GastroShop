'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

export function NewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Вы успешно подписались на рассылку!');
        setEmail('');
        // Reset success message after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Ошибка подписки');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Ошибка подключения к серверу');
    }
  };

  return (
    <div className="border border-neutral-200 rounded-lg p-6 bg-neutral-50">
      <div className="flex items-start gap-4">
        <Mail className="w-5 h-5 mt-1 flex-shrink-0 text-neutral-600" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1 text-neutral-900">Подпишитесь на рассылку</h3>
          <p className="text-neutral-600 mb-4 text-sm">
            Получайте новости о новых продуктах, специальных предложениях и акциях
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ваш email"
              required
              className="flex-1 bg-white"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              variant="default"
              className="whitespace-nowrap"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                'Подписаться'
              )}
            </Button>
          </form>

          {status === 'success' && message && (
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {status === 'error' && message && (
            <div className="mt-3 flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

