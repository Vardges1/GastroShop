'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MapPin, Mail, Phone } from 'lucide-react';

// Контакты — исправленная финальная версия (две колонки: слева контакты+форма, справа карта)

// ---------------- Icons ----------------
const Icon = ({ name, className = "w-5 h-5" }: { 
  name: 'pin' | 'mail' | 'phone'; 
  className?: string;
}) => {
  const common = { className, fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (name) {
    case "pin":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.1 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.66 12.66 0 00.7 2.81 2 2 0 01-.45 2.11L8 9a16 16 0 006 6l.36-.36a2 2 0 012.11-.45 12.66 12.66 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    default:
      return null;
  }
};

const ContactItem = ({ icon, title, children }: { 
  icon: 'pin' | 'mail' | 'phone'; 
  title: string; 
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.45 }}
    className="flex flex-col items-start text-left"
  >
    <div className="flex items-center gap-2 mb-1 text-neutral-800">
      <Icon name={icon} className="w-5 h-5" />
      <div className="text-sm font-medium">{title}</div>
    </div>
    <div className="text-neutral-600 text-sm leading-relaxed">{children}</div>
  </motion.div>
);

// ---------------- Validation ----------------
const validate = (data: { name: string; email: string; message: string }) => {
  const errors: Record<string, string> = {};
  
  if (!data.name || data.name.trim().length < 2) {
    errors.name = "Укажите имя (минимум 2 символа)";
  }
  
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRe.test(data.email)) {
    errors.email = "Введите корректный email";
  }
  
  if (!data.message || data.message.trim().length < 10) {
    errors.message = "Сообщение слишком короткое";
  }
  
  return errors;
};

// ---------------- Page ----------------
export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>("idle");

  const mapEmbedUrl = useMemo(() => {
    // TODO: замените на реальный embed (Яндекс/Google)
    return "https://yandex.ru/map-widget/v1/?um=constructor%3A0000000000000000000000000000000000000000000000000000000000000000&source=constructor";
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const v = validate(form);
    setErrors(v);
    
    if (Object.keys(v).length) return;
    
    setStatus("loading");
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      
      if (!res.ok) throw new Error("Bad response");
      
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
    }
  };

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => setStatus("idle"), 3500);
      return () => clearTimeout(t);
    }
  }, [status]);

  // Предварительно вычисляем классы для полей
  const nameClass = `w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ${errors.name ? 'border-red-300 ring-red-200' : 'border-neutral-300 focus:ring-black'}`;
  const emailClass = `w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 ${errors.email ? 'border-red-300 ring-red-200' : 'border-neutral-300 focus:ring-black'}`;
  const msgClass = `w-full border rounded-xl px-4 py-3 h-28 resize-none focus:outline-none focus:ring-2 ${errors.message ? 'border-red-300 ring-red-200' : 'border-neutral-300 focus:ring-black'}`;

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900">
      <Header />
      
      <main className="flex-1">
        {/* HERO */}
        <section className="text-center py-24 bg-gradient-to-b from-white to-neutral-50">
          <h1 className="text-5xl md:text-6xl font-serif tracking-tight">Контакты</h1>
          <p className="text-neutral-500 mt-4 text-lg max-w-xl mx-auto">
            Мы всегда на связи — выберите удобный способ и напишите нам.
          </p>
        </section>

        {/* Две колонки: слева контакты+форма, справа карта */}
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            {/* Левая колонка */}
            <div className="space-y-10">
              {/* Контакты */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <ContactItem icon="pin" title="Адрес">
                  Москва, 123 Gastronomy Street
                  <div>
                    <a href="#map" className="underline underline-offset-2 hover:text-neutral-700">
                      Открыть на карте
                    </a>
                  </div>
                </ContactItem>

                <ContactItem icon="mail" title="Электронная почта">
                  <a href="mailto:hello@gastroshop.com" className="hover:text-neutral-700">
                    hello@gastroshop.com
                  </a>
                </ContactItem>

                <ContactItem icon="phone" title="Телефон">
                  <a href="tel:+74951234567" className="hover:text-neutral-700">
                    +7 (495) 123‑45‑67
                  </a>
                </ContactItem>
              </div>

              {/* Форма */}
              <section className="max-w-md md:max-w-none">
                <h2 className="text-2xl font-serif">Связаться с нами</h2>
                <form className="space-y-5 mt-6" onSubmit={onSubmit} noValidate>
                  <div>
                    <label htmlFor="name" className="block text-sm mb-1">Имя</label>
                    <input 
                      name="name" 
                      id="name" 
                      value={form.name} 
                      onChange={onChange} 
                      className={nameClass}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm mb-1">Email</label>
                    <input 
                      type="email" 
                      name="email" 
                      id="email" 
                      value={form.email} 
                      onChange={onChange} 
                      className={emailClass}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm mb-1">Сообщение</label>
                    <textarea 
                      name="message" 
                      id="message" 
                      value={form.message} 
                      onChange={onChange} 
                      className={msgClass}
                    />
                    {errors.message && (
                      <p className="text-xs text-red-600 mt-1">{errors.message}</p>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={status === 'loading'} 
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-black text-white font-medium hover:bg-neutral-800 transition disabled:opacity-60"
                  >
                    {status === 'loading' ? 'Отправка…' : 'Отправить сообщение'}
                  </button>

                  {status === 'success' && (
                    <p className="text-sm text-green-600 mt-2">
                      Спасибо! Ваше сообщение отправлено.
                    </p>
                  )}
                  
                  {status === 'error' && (
                    <p className="text-sm text-red-600 mt-2">
                      Не удалось отправить. Попробуйте позже или напишите на hello@gastroshop.com
                    </p>
                  )}
                </form>
              </section>
            </div>

            {/* Правая колонка: карта (sticky) */}
            <div id="map" className="md:sticky md:top-24">
              <div className="rounded-2xl border border-neutral-200 overflow-hidden">
                <iframe
                  title="GastroShop — карта"
                  src={mapEmbedUrl}
                  className="w-full h-[480px] md:h-[560px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <p className="text-center text-xs text-neutral-500 mt-2">
                Если карта не загрузилась, проверьте блокировщики рекламы или откройте страницу в новом окне.
              </p>
            </div>
          </div>
        </section>

        {/* Часы работы */}
        <section className="max-w-3xl mx-auto px-6 pb-20">
          <p className="text-center text-sm text-neutral-500">
            Ежедневно с 10:00 до 19:00. Онлайн‑заказы — 24/7.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
