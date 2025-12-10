'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

// «О нас» — обновлённый премиальный вариант (Apple/IKEA)
// Убрана секция «Наши ценности», уточнена формулировка про производителей.

const Card = ({ icon, title, children }: { 
  icon: string; 
  title: string; 
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
  >
    <div className="text-3xl mb-3">{icon}</div>
    <h3 className="text-xl font-medium mb-2 text-neutral-900">{title}</h3>
    <p className="text-neutral-600 leading-relaxed text-sm md:text-base">{children}</p>
  </motion.div>
);

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900">
      <Header />
      
      <main className="flex-1">
        {/* HERO */}
        <section className="text-center py-28 md:py-36 bg-gradient-to-b from-white via-neutral-50 to-[#faf8f3]">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-7xl font-serif tracking-tight mb-4">О нас</h1>
            <p className="text-neutral-600 text-xl max-w-3xl mx-auto leading-relaxed">
              GastroShop — это вкус, который объединяет.
            </p>
          </motion.div>
        </section>

        {/* Наша история */}
        <section className="max-w-5xl mx-auto px-6 pb-12">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-neutral-200 shadow-sm p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-serif mb-4">Наша история</h2>
            <p className="text-neutral-700 leading-relaxed mb-6 text-lg">
              Мы начали как небольшая команда энтузиастов гастрономии, вдохновлённых поездками по Европе и желанием делиться подлинными вкусами. Сегодня GastroShop объединяет лучших производителей из Франции, Италии и Испании, чтобы предложить россиянам качественные продукты, сделанные с любовью.
            </p>
            <p className="text-neutral-700 leading-relaxed text-lg">
              Мы гордимся тем, что сотрудничаем с европейскими заводами‑производителями, известными своим мастерством и многолетним опытом. Каждый продукт проходит тщательную проверку качества и попадает в каталог только после личного одобрения нашей команды.
            </p>
          </div>
        </section>

        {/* Почему GastroShop */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <h2 className="text-3xl md:text-4xl font-serif mb-8 text-center">Почему выбирают GastroShop</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card icon="🧀" title="Аутентичность">
              Оригинальные продукты из Европы, произведённые в соответствии с традициями и сертификатами качества.
            </Card>

            <Card icon="🔍" title="Контроль качества">
              Мы тщательно проверяем поставщиков и условия хранения, чтобы сохранить вкус и свежесть каждого продукта.
            </Card>

            <Card icon="🚚" title="Бережная доставка">
              Современная логистика и экологичная упаковка обеспечивают быструю и безопасную доставку по России.
            </Card>

            <Card icon="💬" title="Персональный подход">
              Наш гастрономический ассистент поможет подобрать идеальные продукты под ваши вкусовые предпочтения.
            </Card>

            <Card icon="🌍" title="Ответственность">
              Мы поддерживаем устойчивое производство и минимизируем углеродный след в логистике.
            </Card>

            <Card icon="🤝" title="Честность и доверие">
              Прямые поставки, прозрачные условия и уважение к каждому клиенту и партнёру.
            </Card>
          </div>
        </section>

        {/* Миссия */}
        <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="bg-[#faf8f3] border border-amber-200 rounded-2xl p-8 md:p-12 text-center shadow-sm">
            <p className="text-neutral-800 text-xl md:text-2xl font-serif">
              «Мы верим, что гастрономия — это не просто вкус. Это история, уважение и эмоция, которую можно разделить»
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
          <p className="text-neutral-600 mb-5 text-lg">Хотите узнать больше или стать партнёром?</p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 rounded-xl bg-black text-white hover:bg-neutral-800 transition text-lg font-medium"
          >
            Связаться с нами
          </Link>
        </section>

      </main>

      <Footer />
    </div>
  );
}
