'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import api from '@/lib/api';
import type { Product, PaginatedResponse, Order } from '@/types';
import { Package, CheckCircle, Clock, XCircle, Truck, Grid3x3, Box, Receipt, Settings, Plus, Users, Search, Filter, Eye, Edit } from 'lucide-react';
import Image from 'next/image';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { User } from '@/types';

type Tab = 'dashboard' | 'products' | 'orders' | 'users' | 'settings';

// Утилиты
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// Транслитерация для slug
const translitMap: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => translitMap[ch] || ch)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// Компоненты UI
const SidebarLink = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 w-full text-left px-3 py-2 rounded-xl transition',
      active 
        ? 'bg-black dark:bg-white text-white dark:text-black' 
        : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
    )}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700">
    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
      <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-neutral-100 text-neutral-700 mr-1 mt-1">
    {children}
  </span>
);

// Модалка добавления товара
const AddProductModal = ({ 
  open, 
  onClose, 
  onCreate 
}: { 
  open: boolean; 
  onClose: () => void; 
  onCreate: (product: any) => Promise<void> 
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(0);
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('cheese, soft, french');
  const [region, setRegion] = useState('FR');
  const [images, setImages] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleName = (v: string) => {
    setName(v);
    setSlug(toSlug(v));
  };

  // Обработка файлов изображений
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log('No files provided');
      return;
    }
    
    const fileArray = Array.from(files);
    console.log('Files received:', fileArray.length);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Пожалуйста, выберите только изображения');
      return;
    }

    console.log('Image files to process:', imageFiles.length);

    // Преобразуем файлы в data URLs или пути
    const imagePromises = imageFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          console.log('File read successfully:', file.name);
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', file.name, error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((dataUrls) => {
      console.log('All files processed, dataUrls:', dataUrls.length);
      // Объединяем с существующими изображениями
      const existingImages = images.split(',').map((s) => s.trim()).filter(Boolean);
      const allImages = [...existingImages, ...dataUrls].filter(Boolean);
      console.log('Setting images:', allImages.length);
      setImages(allImages.join(', '));
    }).catch((error) => {
      console.error('Error processing files:', error);
      alert('Ошибка при обработке файлов. Попробуйте еще раз.');
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Проверяем, что мы действительно покидаем область (не переходим на дочерний элемент)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    console.log('Drop event triggered');
    const files = e.dataTransfer.files;
    console.log('Files in drop:', files.length);
    
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!name || !slug || price <= 0) {
      alert('Заполните обязательные поля: название, slug и цена');
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        slug: slug || toSlug(name),
        title: name,
        description: desc,
        price_cents: Math.round(price * 100),
        currency: 'RUB',
        quantity: qty,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        region_code: region || undefined,
        images: images.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onClose();
      // Reset form
      setName('');
      setSlug('');
      setPrice(0);
      setQty(0);
      setDesc('');
      setTags('cheese, soft, french');
      setRegion('FR');
      setImages('');
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setName('');
      setSlug('');
      setPrice(0);
      setQty(0);
      setDesc('');
      setTags('cheese, soft, french');
      setRegion('FR');
      setImages('');
      setIsDragging(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold">Добавить товар</h3>
          <button className="text-neutral-500 hover:text-black" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Название *</label>
              <input 
                value={name} 
                onChange={(e) => handleName(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" 
                placeholder="Camembert AOP" 
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Slug *</label>
              <input 
                value={slug} 
                onChange={(e) => setSlug(toSlug(e.target.value))} 
                className="w-full border rounded-xl px-3 py-2" 
                placeholder="camembert-aop" 
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Описание</label>
              <textarea 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 h-24 resize-y max-h-48 overflow-y-auto" 
                placeholder="Классический мягкий сыр из Нормандии..." 
                style={{ minHeight: '96px' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Цена (руб) *</label>
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} 
                  className="w-full border rounded-xl px-3 py-2" 
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Количество *</label>
                <input 
                  type="number" 
                  value={qty} 
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)} 
                  className="w-full border rounded-xl px-3 py-2" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Теги (через запятую)</label>
              <input 
                value={tags} 
                onChange={(e) => setTags(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Код региона</label>
              <input 
                value={region} 
                onChange={(e) => setRegion(e.target.value.toUpperCase())} 
                className="w-full border rounded-xl px-3 py-2" 
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-neutral-600 mb-2">Изображения (пути через запятую или перетащите файлы)</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full border-2 border-dashed rounded-xl px-4 py-6 transition-all",
                  isDragging 
                    ? "border-blue-500 bg-blue-50 scale-[1.02]" 
                    : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id="image-upload"
                />
                
                {/* Показываем миниатюры если есть изображения */}
                {images && images.split(',').map((s) => s.trim()).filter(Boolean).length > 0 ? (
                  <div className="space-y-4" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                    <div className="grid grid-cols-2 gap-3">
                      {images.split(',').map((s) => s.trim()).filter(Boolean).map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const imgList = images.split(',').map((s) => s.trim()).filter(Boolean);
                              imgList.splice(index, 1);
                              setImages(imgList.length > 0 ? imgList.join(', ') : '');
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                      >
                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <div className="text-center">
                          <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Добавить еще файлы</span>
                          <span className="text-sm text-neutral-500"> или перетащите сюда</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <div className="text-center">
                      <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Выбрать файлы</span>
                      <span className="text-sm text-neutral-500"> или перетащите изображения сюда</span>
                    </div>
                    <span className="text-xs text-neutral-400">Поддерживаются: JPG, PNG, GIF, WebP</span>
                  </label>
                )}
                
                <input 
                  value={images} 
                  onChange={(e) => setImages(e.target.value)} 
                  className="w-full mt-4 border rounded-lg px-3 py-1.5 text-sm" 
                  placeholder="/images/product.jpg, /images/product2.jpg"
                  onClick={(e) => e.stopPropagation()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFiles(files);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-neutral-50">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose} disabled={loading}>Отмена</button>
          <button 
            className="px-4 py-2 rounded-xl bg-black text-white disabled:bg-gray-400" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Модалка редактирования товара
const EditProductModal = ({ 
  open, 
  onClose, 
  product,
  onUpdate 
}: { 
  open: boolean; 
  onClose: () => void; 
  product: Product | null;
  onUpdate: (id: number, product: any) => Promise<void> 
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState(0);
  const [qty, setQty] = useState(0);
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [region, setRegion] = useState('');
  const [images, setImages] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Заполняем форму данными товара при открытии
  useEffect(() => {
    if (product && open) {
      setName(product.title || '');
      setSlug(product.slug || '');
      setPrice((product.price_cents || 0) / 100);
      setQty(product.quantity || 0);
      setDesc(product.description || '');
      setTags(product.tags?.join(', ') || '');
      setRegion(product.region_code || '');
      setImages(product.images?.join(', ') || '');
    }
  }, [product, open]);

  const handleName = (v: string) => {
    setName(v);
    setSlug(toSlug(v));
  };

  // Обработка файлов изображений
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log('No files provided');
      return;
    }
    
    const fileArray = Array.from(files);
    console.log('Files received:', fileArray.length);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Пожалуйста, выберите только изображения');
      return;
    }

    console.log('Image files to process:', imageFiles.length);

    // Преобразуем файлы в data URLs или пути
    const imagePromises = imageFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          console.log('File read successfully:', file.name);
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', file.name, error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((dataUrls) => {
      console.log('All files processed, dataUrls:', dataUrls.length);
      // Объединяем с существующими изображениями
      const existingImages = images.split(',').map((s) => s.trim()).filter(Boolean);
      const allImages = [...existingImages, ...dataUrls].filter(Boolean);
      console.log('Setting images:', allImages.length);
      setImages(allImages.join(', '));
    }).catch((error) => {
      console.error('Error processing files:', error);
      alert('Ошибка при обработке файлов. Попробуйте еще раз.');
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Проверяем, что мы действительно покидаем область (не переходим на дочерний элемент)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    console.log('Drop event triggered');
    const files = e.dataTransfer.files;
    console.log('Files in drop:', files.length);
    
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleSubmit = async () => {
    if (!product) return;
    
    if (!name || !slug || price <= 0) {
      alert('Заполните обязательные поля: название, slug и цена');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        title: name,
        description: desc || undefined,
        price_cents: Math.round(price * 100),
        currency: 'RUB',
        quantity: qty,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        images: images.split(',').map((s) => s.trim()).filter(Boolean),
      };
      
      if (region) {
        updateData.region_code = region;
      }
      
      await onUpdate(product.id, updateData);
      onClose();
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(error.response?.data?.error || 'Ошибка при обновлении товара');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setIsDragging(false);
    }
  }, [open]);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold">Редактировать товар</h3>
          <button className="text-neutral-500 hover:text-black" onClick={onClose}>✕</button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Название *</label>
              <input 
                value={name} 
                onChange={(e) => handleName(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" 
                placeholder="Camembert AOP" 
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Slug *</label>
              <input 
                value={slug} 
                onChange={(e) => setSlug(toSlug(e.target.value))} 
                className="w-full border rounded-xl px-3 py-2" 
                placeholder="camembert-aop" 
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Описание</label>
              <textarea 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2 h-24 resize-y max-h-48 overflow-y-auto" 
                placeholder="Классический мягкий сыр из Нормандии..." 
                style={{ minHeight: '96px' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Цена (руб) *</label>
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} 
                  className="w-full border rounded-xl px-3 py-2" 
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 mb-1">Количество *</label>
                <input 
                  type="number" 
                  value={qty} 
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)} 
                  className="w-full border rounded-xl px-3 py-2" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Теги (через запятую)</label>
              <input 
                value={tags} 
                onChange={(e) => setTags(e.target.value)} 
                className="w-full border rounded-xl px-3 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">Код региона</label>
              <input 
                value={region} 
                onChange={(e) => setRegion(e.target.value.toUpperCase())} 
                className="w-full border rounded-xl px-3 py-2" 
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-neutral-600 mb-2">Изображения (пути через запятую или перетащите файлы)</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full border-2 border-dashed rounded-xl px-4 py-6 transition-all",
                  isDragging 
                    ? "border-blue-500 bg-blue-50 scale-[1.02]" 
                    : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  id="image-upload-edit"
                />
                
                {/* Показываем миниатюры если есть изображения */}
                {images && images.split(',').map((s) => s.trim()).filter(Boolean).length > 0 ? (
                  <div className="space-y-4" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                    <div className="grid grid-cols-2 gap-3">
                      {images.split(',').map((s) => s.trim()).filter(Boolean).map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const imgList = images.split(',').map((s) => s.trim()).filter(Boolean);
                              imgList.splice(index, 1);
                              setImages(imgList.length > 0 ? imgList.join(', ') : '');
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <label
                        htmlFor="image-upload-edit"
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                      >
                        <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <div className="text-center">
                          <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Добавить еще файлы</span>
                          <span className="text-sm text-neutral-500"> или перетащите сюда</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload-edit"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <div className="text-center">
                      <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">Выбрать файлы</span>
                      <span className="text-sm text-neutral-500"> или перетащите изображения сюда</span>
                    </div>
                    <span className="text-xs text-neutral-400">Поддерживаются: JPG, PNG, GIF, WebP</span>
                  </label>
                )}
                
                <input 
                  value={images} 
                  onChange={(e) => setImages(e.target.value)} 
                  className="w-full mt-4 border rounded-lg px-3 py-1.5 text-sm" 
                  placeholder="/images/product.jpg, /images/product2.jpg"
                  onClick={(e) => e.stopPropagation()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFiles(files);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-neutral-50">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose} disabled={loading}>Отмена</button>
          <button 
            className="px-4 py-2 rounded-xl bg-black text-white disabled:bg-gray-400" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [section, setSection] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    activeOrders: 0,
    productsInStock: 0,
    lowStockProducts: 0,
  });
  const [statistics, setStatistics] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [orderFilters, setOrderFilters] = useState({
    status: '',
    search: '',
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderProductsMap, setOrderProductsMap] = useState<Map<number, Product>>(new Map());
  const hasRedirected = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchProducts = useCallback(async () => {
    try {
      const response: PaginatedResponse<Product> = await api.admin.products.getAll();
      setProducts(response.items || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки товаров');
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const ordersData = await api.admin.orders.getAll();
      const ordersList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(ordersList);
      
      // Загружаем информацию о продуктах для всех заказов
      const productIds = new Set<number>();
      ordersList.forEach((order: Order) => {
        order.items.forEach(item => {
          productIds.add(item.product_id);
        });
      });
      
      if (productIds.size > 0) {
        try {
          const response = await api.admin.products.getAll({ page_size: 1000 });
          const productsMap = new Map<number, Product>();
          response.items.forEach((product: Product) => {
            if (productIds.has(product.id)) {
              productsMap.set(product.id, product);
            }
          });
          setOrderProductsMap(productsMap);
        } catch (error) {
          console.error('Failed to load products for orders:', error);
        }
      }
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setOrders([]); // Set empty array on error
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [ordersData, productsData] = await Promise.all([
        api.admin.orders.getAll(),
        api.admin.products.getAll({ page_size: 1000 }),
      ]);

      // Ensure ordersData is an array
      const ordersList = Array.isArray(ordersData) ? ordersData : [];

      // Выручка за сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRevenue = ordersList
        .filter((o: Order) => {
          const orderDate = new Date(o.created_at);
          return orderDate >= today && (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered');
        })
        .reduce((sum: number, o: Order) => sum + o.amount_cents, 0);

      // Активные заказы
      const activeOrders = ordersList.filter((o: Order) => 
        ['paid', 'shipped'].includes(o.status)
      ).length;

      // Товары на складе
      const productsInStock = productsData.items?.length || 0;
      const lowStockProducts = productsData.items?.filter((p: Product) => 
        (p.quantity || 0) > 0 && (p.quantity || 0) < 5
      ).length || 0;

      setStats({
        todayRevenue: todayRevenue / 100,
        activeOrders,
        productsInStock,
        lowStockProducts,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const statsData = await api.admin.statistics.get();
      setStatistics(statsData);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const usersData = await api.admin.users.getAll();
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchOrders(), fetchStats(), fetchStatistics()]);
    } finally {
      setLoading(false);
    }
  }, [fetchProducts, fetchOrders, fetchStats, fetchStatistics]);

  // Monitor auth state changes for logout
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoggingOut(true);
    } else {
      setIsLoggingOut(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Wait for client-side hydration
    if (typeof window === 'undefined') return;
    
    // Don't proceed if logging out
    if (isLoggingOut) {
      return;
    }
    
    // Check if user is authenticated - redirect immediately if not (only once)
    if (!isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/account');
      return;
    }
    
    // Check if user is admin - redirect immediately if not (only once)
    if (user?.role !== 'admin' && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/');
      return;
    }
    
    // Reset redirect flag if user becomes authenticated and admin
    if (isAuthenticated && user?.role === 'admin') {
      hasRedirected.current = false;
    }
    
    // Only load data if authenticated and admin
    if (isAuthenticated && user?.role === 'admin') {
      if (section === 'users') {
        fetchUsers();
      } else {
        loadData();
      }
    }
  }, [isAuthenticated, user?.role, section, router, fetchUsers, loadData, isLoggingOut]);

  const handleUserRoleUpdate = useCallback(async (userId: number, newRole: string) => {
    try {
      await api.admin.users.updateRole(userId, newRole);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка обновления роли');
    }
  }, [fetchUsers]);

  const handleUserBlockedUpdate = useCallback(async (userId: number, blocked: boolean) => {
    try {
      await api.admin.users.updateBlocked(userId, blocked);
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка блокировки пользователя');
    }
  }, [fetchUsers]);

  const handleCreateProduct = useCallback(async (productData: any) => {
    await api.admin.products.create(productData);
    await fetchProducts();
    await fetchStats();
  }, [fetchProducts, fetchStats]);

  const handleUpdateProduct = useCallback(async (id: number, productData: any) => {
    await api.admin.products.update(id, productData);
    await fetchProducts();
    await fetchStats();
  }, [fetchProducts, fetchStats]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
    try {
      await api.admin.products.delete(id);
      console.log('Product deleted successfully');
      await fetchProducts();
      await fetchStats();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Ошибка удаления товара';
      alert(errorMessage);
    }
  }, [fetchProducts, fetchStats]);

  const handleQuantityUpdate = useCallback(async (id: number, newQuantity: number) => {
    try {
      const result = await api.admin.products.updateQuantity(id, newQuantity);
      console.log('Quantity updated successfully:', result);
      await fetchProducts();
      await fetchStats();
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Ошибка обновления количества';
      alert(errorMessage);
    }
  }, [fetchProducts, fetchStats]);

  const handleStatusUpdate = useCallback(async (orderId: number, newStatus: string) => {
    try {
      const updatedOrder = await api.admin.orders.updateStatus(orderId, newStatus);
      console.log('Order status updated:', updatedOrder);
      // Обновляем локальное состояние заказов
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      await fetchOrders();
      await fetchStats();
    } catch (err: any) {
      console.error('Error updating order status:', err);
      alert(err.response?.data?.error || 'Ошибка обновления статуса заказа');
    }
  }, [fetchOrders, fetchStats]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      pending: { label: 'В обработке', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' },
      paid: { label: 'Оплачен', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      shipped: { label: 'Отправлен', icon: <Truck className="h-4 w-4" />, color: 'text-blue-600' },
      delivered: { label: 'Доставлен', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      canceled: { label: 'Отменен', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' },
    };
    return statusMap[status] || { label: status, icon: <Clock className="h-4 w-4" />, color: 'text-gray-600' };
  };

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`;
  };

  // Разделы контента - defined before useMemo to ensure hooks order
  const DashboardContent = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-5">
        <Card title="Сегодня">
          <div className="text-3xl font-semibold">{stats.todayRevenue.toLocaleString('ru-RU')} ₽</div>
          <div className="text-sm text-neutral-500 mt-1">Выручка за сегодня</div>
        </Card>
        <Card title="Активные заказы">
          <div className="text-3xl font-semibold">{stats.activeOrders}</div>
          <div className="text-sm text-neutral-500 mt-1">
            {(orders || []).filter(o => o.status === 'paid').length} — оплачены, {(orders || []).filter(o => o.status === 'shipped').length} — в доставке
          </div>
        </Card>
        <Card title="Товары на складе">
          <div className="text-3xl font-semibold">{stats.productsInStock}</div>
          <div className="text-sm text-neutral-500 mt-1">
            из них {stats.lowStockProducts} с остатком &lt; 5
          </div>
        </Card>
      </div>

      {statistics && (
        <>
          <Card title="Статистика продаж">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-2xl font-semibold">{statistics.total_revenue?.toLocaleString('ru-RU') || 0} ₽</div>
                <div className="text-sm text-neutral-500">Общая выручка</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{statistics.order_count || 0}</div>
                <div className="text-sm text-neutral-500">Всего заказов</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{statistics.avg_order_value?.toLocaleString('ru-RU') || 0} ₽</div>
                <div className="text-sm text-neutral-500">Средний чек</div>
              </div>
            </div>
            {statistics.sales_by_day && statistics.sales_by_day.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={statistics.sales_by_day}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="#000" name="Выручка (₽)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          {statistics.top_products && statistics.top_products.length > 0 && (
            <Card title="Топ товаров">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b">
                      <th className="py-3 pr-6">Товар</th>
                      <th className="py-3 pr-6">Продано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statistics.top_products.map((item: any) => (
                      <tr key={item.ProductID} className="border-b">
                        <td className="py-3 pr-6 font-medium">{item.Product?.title || `Товар #${item.ProductID}`}</td>
                        <td className="py-3 pr-6">{item.Quantity} шт.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );

  const ProductsContent = () => (
    <>
      <Card 
        title="Товары" 
        actions={
          <button 
            onClick={() => setShowAddModal(true)} 
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black text-white"
          >
            <Plus className="w-4 h-4" /> Добавить товар
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-3 pr-6">Товар</th>
                <th className="py-3 pr-6">Slug</th>
                <th className="py-3 pr-6">Цена</th>
                <th className="py-3 pr-6">Остаток</th>
                <th className="py-3 pr-6">Теги</th>
                <th className="py-3 pr-6">Регион</th>
                <th className="py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-3 pr-6 font-medium">{p.title}</td>
                  <td className="py-3 pr-6 text-neutral-500">{p.slug}</td>
                  <td className="py-3 pr-6">{(p.price_cents / 100).toLocaleString('ru-RU')} ₽</td>
                  <td className="py-3 pr-6">
                    <input
                      type="number"
                      value={p.quantity || 0}
                      onBlur={(e) => {
                        const newQty = parseInt(e.target.value) || 0;
                        const currentQty = p.quantity || 0;
                        if (newQty !== currentQty) {
                          handleQuantityUpdate(p.id, newQty);
                        } else {
                          // Reset to original value if unchanged
                          setProducts(prevProducts => 
                            prevProducts.map(product => 
                              product.id === p.id ? { ...product, quantity: currentQty } : product
                            )
                          );
                        }
                      }}
                      onChange={(e) => {
                        // Just update local state, don't call API yet
                        const newQty = parseInt(e.target.value) || 0;
                        setProducts(prevProducts => 
                          prevProducts.map(product => 
                            product.id === p.id ? { ...product, quantity: newQty } : product
                          )
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-3 pr-6">
                    {p.tags?.map((t, i) => <Pill key={i}>{t}</Pill>)}
                  </td>
                  <td className="py-3 pr-6">{p.region_code || '-'}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingProduct(p);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        title="Редактировать"
                      >
                        <Edit className="w-3 h-3" />
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );

  const OrdersContent = () => {
    const filteredOrders = (orders || []).filter((order) => {
      const matchesStatus = !orderFilters.status || order.status === orderFilters.status;
      const matchesSearch = !orderFilters.search || 
        order.id.toString().includes(orderFilters.search) ||
        (order.user_id && order.user_id.toString().includes(orderFilters.search));
      return matchesStatus && matchesSearch;
    });

    return (
      <>
        <Card 
          title="Заказы" 
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Поиск по ID..."
                  value={orderFilters.search}
                  onChange={(e) => setOrderFilters({ ...orderFilters, search: e.target.value })}
                  className="pl-8 pr-3 py-1.5 border rounded-lg text-sm"
                />
              </div>
              <select
                value={orderFilters.status}
                onChange={(e) => setOrderFilters({ ...orderFilters, status: e.target.value })}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">Все статусы</option>
                <option value="pending">В обработке</option>
                <option value="paid">Оплачен</option>
                <option value="shipped">Отправлен</option>
                <option value="delivered">Доставлен</option>
                <option value="canceled">Отменен</option>
              </select>
            </div>
          }
        >
          {ordersLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-neutral-500 text-sm">Заказы не найдены.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="py-3 pr-6">ID</th>
                    <th className="py-3 pr-6">Клиент</th>
                    <th className="py-3 pr-6">Сумма</th>
                    <th className="py-3 pr-6">Статус</th>
                    <th className="py-3 pr-6">Дата</th>
                    <th className="py-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const status = getStatusLabel(order.status);
                    return (
                      <tr key={order.id} className="border-t">
                        <td className="py-3 pr-6 font-medium">#{order.id}</td>
                        <td className="py-3 pr-6">{order.user_id ? `Пользователь #${order.user_id}` : 'Гость'}</td>
                        <td className="py-3 pr-6">{formatPrice(order.amount_cents)}</td>
                        <td className="py-3 pr-6">
                          <span className={`inline-flex items-center ${status.color}`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </span>
                        </td>
                        <td className="py-3 pr-6 text-neutral-500">
                          {new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Детали"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <div onClick={(e) => e.stopPropagation()}>
                              <select
                                value={order.status}
                                onChange={async (e) => {
                                  e.stopPropagation();
                                  const newStatus = e.target.value;
                                  const selectElement = e.target as HTMLSelectElement;
                                  const oldStatus = order.status;
                                  selectElement.disabled = true;
                                  selectElement.style.opacity = '0.5';
                                  try {
                                    await handleStatusUpdate(order.id, newStatus);
                                  } catch (error) {
                                    // Восстанавливаем старое значение при ошибке
                                    selectElement.value = oldStatus;
                                    alert('Ошибка обновления статуса заказа');
                                  } finally {
                                    selectElement.disabled = false;
                                    selectElement.style.opacity = '1';
                                  }
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                                className="text-xs border rounded px-2 py-1.5 bg-white cursor-pointer hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              >
                                <option value="pending">В обработке</option>
                                <option value="paid">Оплачен</option>
                                <option value="shipped">Отправлен</option>
                                <option value="delivered">Доставлен</option>
                                <option value="canceled">Отменен</option>
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Модалка детального просмотра заказа */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedOrder(null)} />
            <div className="relative bg-white dark:bg-neutral-800 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
                <h3 className="text-xl font-semibold">Заказ #{selectedOrder.id}</h3>
                <button 
                  className="text-neutral-500 hover:text-black dark:hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors" 
                  onClick={() => setSelectedOrder(null)}
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-neutral-500 mb-1">Статус</div>
                    <div className="flex items-center gap-2">
                      {getStatusLabel(selectedOrder.status).icon}
                      <span className="font-medium">{getStatusLabel(selectedOrder.status).label}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-500 mb-1">Сумма</div>
                    <div className="font-semibold text-lg">{formatPrice(selectedOrder.amount_cents)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-neutral-500 mb-1">Дата создания</div>
                    <div className="font-medium">{new Date(selectedOrder.created_at).toLocaleString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm font-medium text-neutral-500 mb-3">Товары</div>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => {
                      const product = orderProductsMap.get(item.product_id);
                      const productName = product?.title || `Товар #${item.product_id}`;
                      const unitPrice = item.price_cents / item.quantity;
                      
                      // Пытаемся определить объем по цене (базовая цена продукта)
                      // Если цена за единицу сильно отличается от базовой цены, возможно это другой объем
                      let volumeInfo = '';
                      if (product) {
                        const basePrice = product.price_cents;
                        const priceDiff = Math.abs(unitPrice - basePrice) / basePrice;
                        
                        // Если разница в цене значительная, пытаемся определить объем
                        if (priceDiff > 0.1) {
                          if (unitPrice < basePrice * 0.6) {
                            volumeInfo = ' ~100г';
                          } else if (unitPrice < basePrice * 1.1) {
                            volumeInfo = ' ~200г';
                          } else if (unitPrice < basePrice * 2.8) {
                            volumeInfo = ' ~500г';
                          } else if (unitPrice < basePrice * 5.5) {
                            volumeInfo = ' ~1кг';
                          }
                        }
                      }
                      
                      return (
                        <div key={idx} className="flex items-start justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">{productName}{volumeInfo && <span className="text-neutral-500 font-normal ml-2">({volumeInfo.trim()})</span>}</div>
                            {product && (
                              <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                                <span>ID: {product.id}</span>
                                {product.region_code && <span>• Регион: {product.region_code}</span>}
                                {product.currency && <span>• {product.currency}</span>}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4 min-w-[120px]">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {item.quantity} шт.
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              по {formatPrice(unitPrice)} за шт.
                            </div>
                            <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mt-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                              Итого: {formatPrice(item.price_cents)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {selectedOrder.shipping_address && Object.keys(selectedOrder.shipping_address).length > 0 && (
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-neutral-500 mb-3">Адрес доставки</div>
                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 space-y-2 border border-neutral-200 dark:border-neutral-700">
                      {selectedOrder.shipping_address.firstName && selectedOrder.shipping_address.lastName && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}
                          </span>
                        </div>
                      )}
                      {selectedOrder.shipping_address.email && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Email:</span>{' '}
                          <span className="text-neutral-900 dark:text-neutral-100">{selectedOrder.shipping_address.email}</span>
                        </div>
                      )}
                      {selectedOrder.shipping_address.phone && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Телефон:</span>{' '}
                          <span className="text-neutral-900 dark:text-neutral-100">{selectedOrder.shipping_address.phone}</span>
                        </div>
                      )}
                      {selectedOrder.shipping_address.address && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Адрес:</span>{' '}
                          <span className="text-neutral-900 dark:text-neutral-100">{selectedOrder.shipping_address.address}</span>
                        </div>
                      )}
                      {(selectedOrder.shipping_address.city || selectedOrder.shipping_address.postalCode) && (
                        <div className="text-sm">
                          <span className="text-neutral-900 dark:text-neutral-100">
                            {selectedOrder.shipping_address.postalCode && `${selectedOrder.shipping_address.postalCode}, `}
                            {selectedOrder.shipping_address.city}
                          </span>
                        </div>
                      )}
                      {selectedOrder.shipping_address.country && (
                        <div className="text-sm">
                          <span className="text-neutral-500">Страна:</span>{' '}
                          <span className="text-neutral-900 dark:text-neutral-100">{selectedOrder.shipping_address.country}</span>
                        </div>
                      )}
                      {selectedOrder.shipping_address.notes && (
                        <div className="text-sm pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <span className="text-neutral-500">Примечания:</span>
                          <div className="text-neutral-900 dark:text-neutral-100 mt-1">{selectedOrder.shipping_address.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const UsersContent = () => (
    <Card title="Пользователи">
      {usersLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-neutral-500 text-sm">Пользователи не найдены.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-3 pr-6">ID</th>
                <th className="py-3 pr-6">Email</th>
                <th className="py-3 pr-6">Роль</th>
                <th className="py-3 pr-6">Статус</th>
                <th className="py-3 pr-6">Дата регистрации</th>
                <th className="py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-3 pr-6 font-medium">#{u.id}</td>
                  <td className="py-3 pr-6">{u.email}</td>
                  <td className="py-3 pr-6">
                    <select
                      value={u.role}
                      onChange={(e) => handleUserRoleUpdate(u.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="customer">Покупатель</option>
                      <option value="admin">Администратор</option>
                    </select>
                  </td>
                  <td className="py-3 pr-6">
                    {u.blocked ? (
                      <span className="text-red-600">Заблокирован</span>
                    ) : (
                      <span className="text-green-600">Активен</span>
                    )}
                  </td>
                  <td className="py-3 pr-6 text-neutral-500">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => handleUserBlockedUpdate(u.id, !u.blocked)}
                      className={`text-xs px-3 py-1 rounded ${
                        u.blocked
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {u.blocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const SettingsContent = () => (
    <Card title="Настройки">
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium">API-ключи / Платежи</div>
          <div className="text-xs text-neutral-500">ЮKassa в тестовом режиме, вебхуки включены</div>
        </div>
        <div>
          <div className="text-sm font-medium">Доступы администраторов</div>
          <div className="text-xs text-neutral-500">Добавляйте и удаляйте аккаунты админов</div>
        </div>
      </div>
    </Card>
  );

  const Content = useMemo(() => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
        </div>
      );
    }

    switch (section) {
      case 'dashboard':
        return <DashboardContent />;
      case 'products':
        return <ProductsContent />;
      case 'orders':
        return <OrdersContent />;
      case 'users':
        return <UsersContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return null;
    }
  }, [section, loading, products, orders, ordersLoading, stats, showAddModal, statistics, users, usersLoading, orderFilters, selectedOrder, handleCreateProduct]);

  // Early return for unauthenticated or non-admin users
  // All hooks must be called before this return (including useMemo above)
  if (isLoggingOut || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{isLoggingOut ? 'Выход...' : 'Доступ запрещен'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Header />
      
      {/* Макет: sidebar + контент */}
      <main className="flex-1">
        <div className="container max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-3 sticky top-24">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 px-3 pb-2">Навигация</div>
              <nav className="space-y-1">
                <SidebarLink 
                  icon={<Grid3x3 className="w-5 h-5" />} 
                  label="Сводка" 
                  active={section === 'dashboard'} 
                  onClick={() => setSection('dashboard')} 
                />
                <SidebarLink 
                  icon={<Box className="w-5 h-5" />} 
                  label="Товары" 
                  active={section === 'products'} 
                  onClick={() => setSection('products')} 
                />
                <SidebarLink 
                  icon={<Receipt className="w-5 h-5" />} 
                  label="Заказы" 
                  active={section === 'orders'} 
                  onClick={() => setSection('orders')} 
                />
                <SidebarLink 
                  icon={<Users className="w-5 h-5" />} 
                  label="Пользователи" 
                  active={section === 'users'} 
                  onClick={() => setSection('users')} 
                />
                <SidebarLink 
                  icon={<Settings className="w-5 h-5" />} 
                  label="Настройки" 
                  active={section === 'settings'} 
                  onClick={() => setSection('settings')} 
                />
              </nav>
            </div>
          </aside>

          <div className="col-span-12 md:col-span-9 lg:col-span-10 space-y-6">
            {Content}
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Модалки вынесены на верхний уровень для правильной работы */}
      <AddProductModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onCreate={handleCreateProduct}
      />
      <EditProductModal 
        open={!!editingProduct} 
        onClose={() => setEditingProduct(null)} 
        product={editingProduct}
        onUpdate={handleUpdateProduct}
      />
    </div>
  );
}
