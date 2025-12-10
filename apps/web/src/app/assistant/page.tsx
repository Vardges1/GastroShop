'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Bot, User, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { Product } from '@/types';

// Функция для форматирования текста с нумерованными списками и абзацами
const formatMessage = (text: string) => {
  const keywords = /(Пармезан|Камамбер|Пекорино|Грана Падано|Дорблю|Грюйер|Манчего|Фета|Моцарелла|Горгонзола|Бри|Рокфор|Хамон|Песто|Оливки|Пармиджано|Реджано)/gi;
  
  // Разбиваем на абзацы (двойной перенос строки)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, pIdx) => {
        const trimmed = paragraph.trim();
        
        // Проверяем, начинается ли абзац с нумерованного списка
        if (/^\d+\.\s/.test(trimmed)) {
          // Разбиваем на элементы списка
          const items = trimmed.split(/\n(?=\d+\.\s)/).filter(item => item.trim());
          
          return (
            <div key={pIdx} className="space-y-3">
              {items.map((item, itemIdx) => {
                const match = item.match(/^(\d+)\.\s([\s\S]+)/);
                if (!match) return null;
                
                const [, number, content] = match;
                
                // Разбиваем содержимое на подразделы
                const sections = content.split(/(Ключевые характеристики:|Как его лучше использовать:|С какими блюдами\/соусами он сочетается:|Лучшее использование:|Сочетания:)/);
                
                return (
                  <div key={itemIdx} className="pl-4 border-l-2 border-cyan-200/60">
                    <div className="flex gap-2.5">
                      <span className="font-bold text-cyan-600 flex-shrink-0 text-base">{number}.</span>
                      <div className="flex-1 space-y-2">
                        {sections.map((section, secIdx) => {
                          if (/^(Ключевые характеристики|Как его лучше использовать|С какими блюдами\/соусами он сочетается|Лучшее использование|Сочетания):/.test(section)) {
                            return (
                              <div key={secIdx} className="font-semibold text-neutral-800 mt-2.5 mb-1 text-sm">
                                {section}
                              </div>
                            );
                          }
                          
                          // Подсвечиваем ключевые слова
                          const parts = section.split(keywords);
                          return (
                            <div key={secIdx} className="leading-relaxed">
                              {parts.map((part, partIdx) => {
                                keywords.lastIndex = 0;
                                if (keywords.test(part)) {
                                  return (
                                    <span key={partIdx} className="font-medium text-neutral-900 bg-cyan-50 px-1.5 py-0.5 rounded">
                                      {part}
                                    </span>
                                  );
                                }
                                return <span key={partIdx}>{part}</span>;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
        
        // Обычный абзац
        const parts = trimmed.split(keywords);
        return (
          <p key={pIdx} className="leading-relaxed">
            {parts.map((part, i) => {
              keywords.lastIndex = 0;
              if (keywords.test(part)) {
                return (
                  <span key={i} className="font-medium text-neutral-900 bg-cyan-50 px-1.5 py-0.5 rounded">
                    {part}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  timestamp: Date;
}

const quickQueries = [
  'Подбери сыр к пасте с морепродуктами',
  'Что взять к сырной тарелке?',
  'Покажи сыры из Нормандии',
  'Собери сырную тарелку на 4 человек',
];

export default function AssistantPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Привет! Сформулируйте запрос — блюдо, событие или регион. Я подберу сыры, объясню, почему они подходят, и сразу предложу позиции из каталога и регионы на карте.',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSearch = async (queryText?: string) => {
    const searchQuery = queryText || query;
    if (!searchQuery.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: searchQuery.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await api.ai.chat(userMessage.content, conversationHistory);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        products: response.products || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка при обращении к ассистенту. Попробуйте ещё раз.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(circle at top left, #fdfaf4 0, #f4f4f7 45%, #f5fbff 100%)' }}>
      <Header />
      <main className="max-w-[1000px] mx-auto px-6 py-6 pb-10">
        <div className="max-w-full">
          {/* ЛЕВАЯ КОЛОНКА */}
          <section>
            {/* Заголовок ассистента */}
            <header className="flex items-center gap-3.5 mb-4.5">
              <div className="relative w-16 h-16 flex-shrink-0">
                <div 
                  className="w-full h-full rounded-full relative overflow-hidden"
                  style={{
                    background: 'radial-gradient(circle at 30% 20%, #ffffff, #e0faff 45%, #1f2937 100%)',
                    boxShadow: '0 0 0 6px rgba(148, 163, 184, 0.25), 0 18px 36px rgba(15, 23, 42, 0.45)',
                  }}
                >
                  <div 
                    className="absolute inset-4 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.9), rgba(226, 232, 240, 0.4))',
                      backdropFilter: 'blur(6px)',
                    }}
                  />
                  <div 
                    className="absolute -inset-[18px] opacity-70"
                    style={{
                      background: 'conic-gradient(from 0deg, rgba(34, 211, 238, 0.7), rgba(168, 85, 247, 0.65), rgba(251, 191, 36, 0.65), rgba(34, 211, 238, 0.7))',
                      mixBlendMode: 'screen',
                      animation: 'spin 7s linear infinite',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Bot className="w-7 h-7 text-neutral-700" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-[26px] font-semibold tracking-wide">Гастрономический ассистент</h1>
                  <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-neutral-400 text-neutral-600 bg-white/80">
                    AI · персональные рекомендации
                  </span>
                </div>
                <p className="text-[13px] text-neutral-600 max-w-[460px]">
                  Подбираю сыры и деликатесы под ваши блюда и сценарии — с учётом вкуса, текстуры и региона происхождения. Спросите меня о чём-нибудь.
                </p>
              </div>
            </header>

            {/* Welcome карточка */}
            <div className="bg-white/90 rounded-[20px] border border-neutral-200/80 p-3.5 mb-2.5 flex gap-2.5 items-start shadow-[0_14px_30px_rgba(148,163,184,0.25)]">
              <div 
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-sm text-neutral-900 flex-shrink-0"
                style={{
                  background: 'radial-gradient(circle at 30% 20%, #ffffff, #22d3ee)',
                  boxShadow: '0 10px 20px rgba(34,211,238,0.45)',
                }}
              >
                ✦
              </div>
              <div className="flex-1">
                <div className="text-[13px] mb-1">
                  Здравствуйте! Я — <span className="font-semibold">гастрономический ассистент GastroShop</span>.
                </div>
                <div className="text-[12px] text-neutral-600 mb-2">
                  Могу подобрать сыр к конкретному блюду, собрать сырную тарелку и показать продукты на интерактивной карте.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearch(q)}
                      disabled={loading}
                      className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-700 cursor-pointer transition-all hover:bg-cyan-50 hover:border-cyan-400 hover:text-neutral-900 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(34,211,238,0.35)] whitespace-nowrap disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Чат */}
            <div 
              className="rounded-[22px] p-3.5 pb-[62px] relative min-h-[230px] flex flex-col gap-2"
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.97))',
                border: '1px solid rgba(229, 231, 235, 0.9)',
                boxShadow: '0 18px 40px rgba(148, 163, 184, 0.35)',
              }}
            >
              <div ref={chatScrollRef} className="overflow-y-auto pr-0.5 flex flex-col gap-3">
                {messages.map((message) => (
                  <div key={message.id} className="flex flex-col gap-2">
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                        message.role === 'assistant'
                          ? 'bg-white border border-neutral-200/90 self-start'
                          : 'bg-neutral-900 text-neutral-200 self-end rounded-br-sm'
                      }`}
                    >
                      {message.role === 'assistant' ? formatMessage(message.content) : message.content}
                    </div>
                    
                    {/* Показываем продукты прямо в чате */}
                    {message.role === 'assistant' && message.products && message.products.length > 0 && (
                      <div className="max-w-[85%] self-start">
                        <div className="grid grid-cols-2 gap-2.5 mt-2">
                          {message.products.map((product) => (
                            <Link key={product.id} href={`/shop/${product.slug}`}>
                              <div className="rounded-[14px] border border-neutral-200/90 bg-white/96 p-2.5 flex flex-col gap-1.5 text-[11px] hover:shadow-lg transition-all hover:scale-[1.02]">
                                {product.images?.[0] && (
                                  <div className="h-20 rounded-[10px] bg-gradient-to-br from-amber-100 to-red-100 relative overflow-hidden mb-1">
                                    <Image
                                      src={product.images[0]}
                                      alt={product.title}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="font-semibold line-clamp-1 text-neutral-900">{product.title}</div>
                                <div className="flex justify-between items-center gap-2 text-neutral-600">
                                  <span className="whitespace-nowrap text-[10px]">
                                    {product.region_code || 'Европа'} · {product.tags?.[0] || 'сыр'}
                                  </span>
                                  <span className="font-semibold text-neutral-900 whitespace-nowrap">
                                    {((product.price_cents || 0) / 100).toLocaleString('ru-RU')} ₽
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2.5">
                          <Link
                            href={`/shop${message.products.length > 0 ? `?products=${message.products.map(p => p.id).join(',')}` : ''}`}
                            className="text-[11px] rounded-full px-3 py-1.5 border-none cursor-pointer inline-flex items-center gap-1 whitespace-nowrap bg-neutral-900 text-neutral-50 hover:bg-neutral-800 transition"
                          >
                            Открыть в каталоге →
                          </Link>
                          <Link
                            href={`/map${message.products.length > 0 ? `?regions=${Array.from(new Set(message.products.map(p => p.region_code).filter(Boolean))).join(',')}` : ''}`}
                            className="text-[11px] rounded-full px-3 py-1.5 border border-neutral-300 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-800 transition-all duration-200 hover:scale-105 hover:shadow-md hover:-translate-y-0.5"
                          >
                            <MapPin className="w-3 h-3" /> Показать на карте
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-0.5">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.14s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.28s' }} />
                    </div>
                    <span>Ассистент думает…</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="absolute left-2.5 right-2.5 bottom-2.5 flex gap-2 items-center">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Введите запрос: «сыр к ризотто с грибами», «что к Просекко», «сыры из Нормандии»…"
                  disabled={loading}
                  className="flex-1 rounded-full border border-neutral-300 bg-neutral-50/95 px-3.5 py-2.5 text-[13px] resize-none max-h-[84px] min-h-[38px] leading-snug outline-none transition-all focus:bg-white focus:border-purple-500 focus:shadow-[0_0_0_1px_rgba(168,85,247,0.7),0_16px_30px_rgba(129,140,248,0.5)]"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={loading || !query.trim()}
                  className="rounded-full border-none px-4 h-[38px] text-[13px] font-medium cursor-pointer flex items-center gap-1 text-white whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
                    boxShadow: '0 12px 30px rgba(37,99,235,0.55), 0 0 18px rgba(34,211,238,0.7)',
                  }}
                >
                  Отправить <span>↗</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
