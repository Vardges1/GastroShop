'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Truck, RefreshCw, Shield, Clock, Mail, Phone } from 'lucide-react';

// --- Встроенные иконки (SVG) ---
const IconTruck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 17h4"/>
    <path d="M3 7h12v10H3z"/>
    <path d="M15 10h4l2 3v4h-6V10z"/>
    <circle cx="7.5" cy="17.5" r="1.5"/>
    <circle cx="17.5" cy="17.5" r="1.5"/>
  </svg>
);

const IconReturn = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
    <path d="m9 15 3-3 3 3"/>
    <path d="M12 12v6"/>
  </svg>
);

const IconShield = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
);

const SectionCard = ({ icon, title, children }: { 
  icon: React.ReactNode; 
  title: string; 
  children: React.ReactNode;
}) => (
  <div className="bg-white shadow-sm rounded-2xl p-6 md:p-8 border border-neutral-200">
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
    </div>
    <div className="prose prose-neutral max-w-none">
      {children}
    </div>
  </div>
);

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 space-y-1 text-neutral-800 mt-2">
    {items.map((i, idx) => <li key={idx}>{i}</li>)}
  </ul>
);

const Callout = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-[#faf8f3] border border-amber-300 rounded-2xl p-4 md:p-5 flex items-start gap-3 mt-4">
    <div className="shrink-0 mt-0.5 text-amber-600"><IconShield width={20} height={20}/></div>
    <div className="text-sm text-neutral-800">{children}</div>
  </div>
);

// --- Брендированный аккордеон FAQ ---
const FAQ = () => {
  const items = [
    {
      q: 'Как отследить мой заказ?',
      a: 'После отправки заказа вы получите трек-номер для отслеживания на email и в SMS. Вы сможете отслеживать статус доставки на сайте транспортной компании.'
    },
    {
      q: 'Что делать, если товар пришел поврежденным?',
      a: 'Немедленно свяжитесь с нами по телефону или email. Сохраните товар и упаковку, сделайте фотографии. Мы оперативно решим вопрос с заменой или возвратом.'
    },
    {
      q: 'Можно ли изменить адрес доставки после оформления заказа?',
      a: 'Да, если заказ еще не отправлен. Свяжитесь с нами как можно скорее, и мы внесем изменения. После отправки изменение адреса может быть платным.'
    },
    {
      q: 'Как хранить продукты после получения?',
      a: 'В каждой посылке вы найдете инструкции по хранению. Сыр и другие деликатесы следует хранить в холодильнике при температуре 2-8°C. Храните в оригинальной упаковке до использования.'
    },
    {
      q: 'Возвращаются ли деньги за доставку при возврате товара?',
      a: 'Стоимость доставки не возвращается, если товар соответствует описанию и был доставлен в надлежащем качестве. При возврате товара ненадлежащего качества мы вернем полную сумму, включая доставку.'
    },
    {
      q: 'Какие способы оплаты доступны?',
      a: 'Мы принимаем оплату банковскими картами, электронными кошельками и наличными при получении (для курьерской доставки в некоторых регионах).'
    }
  ];

  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <button 
              onClick={() => setOpen(isOpen ? null : i)} 
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-neutral-50 transition-colors"
            >
              <span className="text-base md:text-lg font-medium">{it.q}</span>
              <svg 
                viewBox="0 0 24 24" 
                className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <motion.div 
              initial={false} 
              animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }} 
              transition={{ duration: 0.3, ease: [0.6, -0.05, 0.01, 0.99] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0 text-neutral-700">{it.a}</div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
};

export default function ShippingReturnsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900">
      <Header />
      
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-white border-b border-neutral-100">
          <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 backdrop-blur text-sm mb-6 border border-amber-200/50">
                <Truck className="w-4 h-4 text-amber-700" />
                <span className="text-amber-900 font-medium">Доставка по всей России</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif text-neutral-900 mb-4">Доставка & Возвраты</h1>
              <p className="text-neutral-500 mt-4 text-lg max-w-xl mx-auto">
                Мы доставляем бережно и быстро. Если что-то пойдёт не так — решим вопрос без лишних формальностей.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Основной контент */}
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-6">
          <SectionCard 
            icon={<IconTruck className="text-amber-600"/>} 
            title="Условия доставки"
          >
            <p>Мы осуществляем доставку по всей России курьерскими службами и Почтой России. При оформлении заказа вы увидите доступные варианты и сроки.</p>
            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="font-semibold mb-2">Сроки</h3>
                <List items={[
                  "Москва и МО — 1–2 рабочих дня",
                  "Санкт-Петербург — 2–3 рабочих дня",
                  "Регионы РФ — 3–7 рабочих дней (в зависимости от удалённости)",
                  "Отдаленные регионы — до 10 рабочих дней"
                ]} />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Стоимость</h3>
                <p className="text-neutral-700">Рассчитывается автоматически на этапе оформления исходя из веса и региона. Заказы от <strong>5000 ₽</strong> — доставка по Москве и МО бесплатно.</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
                  <IconClock width={18} height={18}/> 
                  <span>Отслеживание: трек-номер приходит на email после отправки.</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Упаковка и сохранность</h3>
              <List items={[
                "Термоизоляция для продуктов, требующих холода",
                "Защитная упаковка для хрупких товаров",
                "Маркировка 'Осторожно' и 'Хрупкое'",
                "Инструкции по хранению в каждой посылке"
              ]} />
            </div>
          </SectionCard>

          <SectionCard 
            icon={<IconReturn className="text-amber-600"/>} 
            title="Возврат товара"
          >
            <p>Вы можете оформить возврат в течение <strong>14 дней</strong> с момента получения заказа.</p>
            <List items={[
              "Товар должен быть в неповреждённой оригинальной упаковке",
              "Без признаков использования",
              "Сохранены чек/электронный заказ"
            ]} />
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Как оформить возврат</h3>
              <ol className="list-decimal pl-5 space-y-1 text-neutral-800">
                <li>Свяжитесь с нами по телефону или email и сообщите о желании вернуть товар</li>
                <li>Укажите номер заказа и причину возврата</li>
                <li>Мы организуем обратную доставку или вы сможете вернуть товар в наш магазин</li>
                <li>После проверки товара мы вернем деньги в течение 3-5 рабочих дней</li>
              </ol>
            </div>
            <Callout>
              Если продукт приехал повреждённым или с нарушением температурного режима — сделайте фото/видео в момент распаковки и свяжитесь с нами. Мы оперативно заменим позицию или вернём деньги.
            </Callout>
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                <strong>Важно:</strong> Продукты питания, требующие специальных условий хранения (скоропортящиеся товары), 
                не подлежат возврату после получения заказа, если они были доставлены в соответствии 
                с указанными условиями и в надлежащем качестве.
              </p>
            </div>
          </SectionCard>

          <SectionCard 
            icon={<IconShield className="text-amber-600"/>} 
            title="Гарантии качества"
          >
            <p>Мы работаем только с проверенными поставщиками и соблюдаем холодовую цепочку при транспортировке. Каждая отправка упаковывается с учётом особенностей товара.</p>
            <List items={[
              "Пломбированные термопакеты",
              "Хладоэлементы при необходимости",
              "Усиленная защита стекла и банок"
            ]} />
          </SectionCard>

          {/* Контактный блок */}
          <div className="rounded-2xl border bg-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-serif mb-2">Нужна помощь?</h3>
              <p className="text-neutral-600">Служба заботы ответит в течение одного рабочего дня.</p>
            </div>
            <div className="flex gap-3">
              <a 
                href="mailto:hello@gastroshop.com" 
                className="px-5 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 transition-colors inline-flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Написать на email
              </a>
              <a 
                href="tel:+74951234567" 
                className="px-5 py-3 rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Позвонить
              </a>
            </div>
          </div>
        </div>

        {/* FAQ — брендированный аккордеон */}
        <section className="max-w-5xl mx-auto px-4 pb-16 pt-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-serif">Частые вопросы</h3>
            <p className="text-neutral-600 mt-1">Мы собрали ответы на самые популярные запросы</p>
          </div>
          <FAQ />
        </section>
      </main>

      <Footer />
    </div>
  );
}
