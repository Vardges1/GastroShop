'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

// UX-ориентированный макет страницы «Условия использования» для GastroShop
// Лёгкий, современный стиль без юридической перегрузки.

const Card = ({ icon, title, children }: { 
  icon: string; 
  title: string; 
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-3 hover:shadow-md transition"
  >
    <div className="text-amber-600 text-2xl">{icon}</div>
    <h3 className="text-xl font-serif text-neutral-900">{title}</h3>
    <p className="text-neutral-600 leading-relaxed text-sm md:text-base">{children}</p>
  </motion.div>
);

const ScaleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3v18"/>
    <path d="M4 9l8 4 8-4"/>
  </svg>
);

export default function TermsPage() {
  const lastUpdated = "Ноябрь 2025";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#faf8f3] via-white to-[#fdfbf9] text-neutral-900">
      <Header />
      
      <main className="flex-1">
        {/* HERO */}
        <section className="text-center py-24 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-serif tracking-tight mb-4">Условия использования</h1>
            <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
              Используя сайт GastroShop, вы соглашаетесь с условиями его использования и принципами нашей работы.
            </p>
            <p className="text-neutral-400 text-sm mt-4">Обновлено: {lastUpdated}</p>
          </motion.div>
        </section>

        {/* MAIN CONTENT */}
        <div className="max-w-5xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
          <Card icon="🌐" title="Использование сайта">
            GastroShop предоставляет доступ к каталогу, рекомендациям и информации о продуктах. Пользователи обязуются использовать сайт в личных, некоммерческих целях и соблюдать общие нормы поведения онлайн.
          </Card>

          <Card icon="📄" title="Контент и авторские права">
            Большая часть фотографий на сайте взята из открытых источников и используется исключительно в демонстрационных целях. Описания и тексты защищены авторским правом GastroShop, их копирование или публикация без согласия запрещены.
          </Card>

          <Card icon="⚖️" title="Ответственность и изменения">
            Мы стремимся к точности информации, но не гарантируем полное отсутствие ошибок. Условия могут обновляться, и продолжение использования сайта означает согласие с обновлённой версией.
          </Card>
        </div>

        {/* CALLOUT */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          transition={{ duration: 0.5 }} 
          className="max-w-4xl mx-auto px-6 pb-16"
        >
          <div className="bg-[#faf8f3] border border-amber-200 rounded-2xl p-6 md:p-8 flex items-start gap-4 shadow-sm">
            <ScaleIcon className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0"/>
            <p className="text-neutral-700 text-sm md:text-base">
              Мы действуем открыто и честно, заботясь о ваших интересах и комфорте. Если у вас есть вопросы об условиях использования, свяжитесь с нами:{' '}
              <a 
                href="mailto:hello@gastroshop.com" 
                className="underline decoration-amber-500 hover:text-amber-600 transition-colors"
              >
                hello@gastroshop.com
              </a>.
            </p>
          </div>
        </motion.section>

        {/* FOOTNOTE */}
        <footer className="text-center text-xs text-neutral-500 pb-10">
          <p>
            Используя сайт GastroShop, вы подтверждаете, что ознакомлены с Условиями использования и Политикой конфиденциальности.
          </p>
        </footer>
      </main>

      <Footer />
    </div>
  );
}
