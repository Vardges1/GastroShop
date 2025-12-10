'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Lock } from 'lucide-react';

// Обновлённый макет страницы «Политика конфиденциальности» — с акцентом на визуальный стиль и эмоциональное доверие.
// Добавлены фоновая иллюстрация, плавные анимации и тёплые акценты.

const Section = ({ title, children }: { 
  title: string; 
  children: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="max-w-4xl mx-auto px-6 py-10 bg-white/60 backdrop-blur-sm rounded-2xl mb-8 shadow-sm border border-neutral-200"
  >
    <h2 className="text-2xl md:text-3xl font-serif mb-4 text-neutral-900">{title}</h2>
    <div className="prose prose-neutral max-w-none text-neutral-700 leading-relaxed">
      {children}
    </div>
  </motion.section>
);

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <path d="M7 11V8a5 5 0 0110 0v3"/>
  </svg>
);

export default function PrivacyPage() {
  const lastUpdated = "Ноябрь 2025";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#faf8f3] via-white to-[#fdfbf9] text-neutral-900 relative overflow-hidden">
      <Header />
      
      <main className="flex-1">
        {/* Декоративный фон */}
        <div className="absolute inset-0 bg-[url('/images/paper-texture.png')] opacity-5 bg-cover pointer-events-none" />

        {/* HERO */}
        <section className="relative text-center py-24 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }} 
            className="relative z-10"
          >
            <h1 className="text-5xl md:text-6xl font-serif tracking-tight mb-5">Политика конфиденциальности</h1>
            <p className="text-neutral-600 text-lg max-w-2xl mx-auto mb-3">
              Мы защищаем ваши персональные данные и уважаем право на приватность каждого клиента.
            </p>
            <p className="text-neutral-400 text-sm">Обновлено: {lastUpdated}</p>
          </motion.div>
        </section>

        {/* TRUST CALLOUT */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          transition={{ duration: 0.5 }} 
          className="max-w-4xl mx-auto px-6 -mt-6 mb-10 relative z-10"
        >
          <div className="bg-gradient-to-r from-white to-[#fff9f0] border border-amber-200 rounded-2xl p-6 md:p-8 flex items-start gap-4 shadow-sm">
            <LockIcon className="text-amber-600 flex-shrink-0 mt-1" />
            <p className="text-neutral-700 text-base leading-relaxed">
              Мы не передаём ваши данные третьим лицам без вашего согласия. Все соединения защищены современным шифрованием (HTTPS, TLS 1.3). Ваше доверие — наш главный приоритет.
            </p>
          </div>
        </motion.section>

        {/* CONTENT SECTIONS */}
        <div className="relative z-10 pb-16">
          <Section title="1. Какие данные мы собираем">
            <ul className="list-disc pl-5 space-y-1">
              <li>Контактные данные: имя, email, телефон.</li>
              <li>Адрес доставки и платёжные метаданные (без хранения реквизитов карт).</li>
              <li>Информация аккаунта: история заказов, предпочтения, избранное.</li>
              <li>Технические данные: IP, cookies, тип устройства, аналитика.</li>
            </ul>
          </Section>

          <Section title="2. Как мы используем данные">
            <ul className="list-disc pl-5 space-y-1">
              <li>Оформление, доставка и поддержка заказов.</li>
              <li>Улучшение пользовательского опыта и персонализация рекомендаций.</li>
              <li>Аналитика и повышение качества сервиса.</li>
              <li>Соблюдение законодательства и предотвращение мошенничества.</li>
            </ul>
          </Section>

          <Section title="3. Хранение и защита">
            <ul className="list-disc pl-5 space-y-1">
              <li>Доступ к данным ограничен авторизованными сотрудниками.</li>
              <li>Пароли и токены зашифрованы и хранятся в защищённом виде.</li>
              <li>Передача информации происходит по HTTPS.</li>
              <li>Мы регулярно обновляем системы безопасности и политики доступа.</li>
            </ul>
          </Section>

          <Section title="4. Cookies и аналитика">
            <p>
              Cookies помогают нам анализировать взаимодействие с сайтом, сохранять ваши предпочтения и улучшать навигацию. 
              Вы можете отключить их в настройках браузера. Аналитика проводится в обезличенном виде и не содержит персональных данных.
            </p>
          </Section>

          <Section title="5. Права пользователя">
            <ul className="list-disc pl-5 space-y-1">
              <li>Получать информацию о своих данных и способах обработки.</li>
              <li>Запрашивать исправление или удаление информации.</li>
              <li>Отозвать согласие на обработку или подписку.</li>
              <li>Обратиться к нам по любым вопросам приватности.</li>
            </ul>
          </Section>

          <Section title="6. Контакты по вопросам приватности">
            <p>
              По всем вопросам, связанным с защитой персональных данных, напишите на{' '}
              <a 
                className="underline decoration-amber-500 hover:text-amber-600 transition-colors" 
                href="mailto:privacy@gastroshop.com"
              >
                privacy@gastroshop.com
              </a>
              . Мы ответим в течение одного рабочего дня.
            </p>
          </Section>

          {/* FOOTNOTE */}
          <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
            <p className="text-xs text-neutral-500">
              Эта политика может обновляться. Актуальная версия публикуется на этой странице. 
              Дата вступления в силу совпадает с датой обновления, указанной выше.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
