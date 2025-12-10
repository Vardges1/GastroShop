"use client"

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'
import { MapMarker } from '@/components/ui/MapMarker'
import { Button } from '@/components/ui/button'
import { X, MapPin, Calendar } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Product } from '@/types'

const cities: Record<string, [number, number]> = {
  'FR': [2.2, 46.2],
  'IT': [12.5, 42.8],
  'ES': [-3.7, 40.4],
  'GR': [23.7, 38.0],
  'CH': [8.3, 46.8],
  'DE': [10.4, 51.1],
  'NL': [5.3, 52.1]
}

// Функция для генерации индивидуального описания происхождения продукта
function generateOriginDescription(product: Product, regionName: string): string {
  const regionCode = product.region_code
  const productTitle = product.title.toLowerCase()
  const tags = product.tags || []
  const slug = product.slug
  
  // Определяем характеристики продукта
  const isSoft = tags.includes('soft')
  const isHard = tags.includes('hard')
  const isAged = tags.includes('aged')
  const isBloomy = tags.includes('bloomy')
  const isCreamy = tags.includes('creamy')
  const isGrated = tags.includes('grated')
  const isItalian = tags.includes('italian')
  const isFrench = tags.includes('french')
  
  // Индивидуальные описания для конкретных продуктов
  const specificDescriptions: Record<string, string> = {
    'brie-de-meaux': `${product.title} - это легендарный французский сыр из региона Иль-де-Франс, который носит статус AOP (Appellation d'Origine Protégée). Производится в небольших семейных сыроварнях уже более 1000 лет. Сыр изготавливается из непастеризованного коровьего молока и созревает в прохладных погребах от 4 до 8 недель. Бархатистая белая бычковая корочка образуется естественным путем благодаря специальным бактериям. Именно климат этого региона с его умеренной влажностью создает идеальные условия для развития уникальной микрофлоры, которая придает сыру его неповторимый нежный грибной вкус с легкой кислинкой.`,
    
    'parmigiano-reggiano': `${product.title} производится исключительно в провинциях Парма, Реджо-Эмилия, Модена и частично в Болонье и Мантуе. Этот сыр имеет статус DOP и изготавливается по строгому рецепту, который не менялся с XIII века. Процесс производства длится минимум 12 месяцев, а премиум-версии созревают до 3 лет. Сыр готовится из сырого молока коров, пасущихся на альпийских лугах, и получает свой характерный зернистый вкус благодаря длительному созреванию в специальных формах. Каждое колесо сыра проверяется экспертами, и только лучшие получают маркировку.`,
    
    'gorgonzola': `${product.title} - один из древнейших итальянских сыров с голубой плесенью, производимый в провинциях Новара и Бергамо в регионе Ломбардия. Исторически сыр изготавливался в небольших горных деревушках, где прохладный влажный климат идеально подходит для развития пенициллина. Классический метод производства включает добавление специальных культур плесени в творожную массу и прокалывание головок сыра длинными иглами для создания каналов, по которым проникает воздух и развивается плесень. Сыр созревает от 3 до 6 месяцев в известковых пещерах, где постоянная температура и влажность формируют его кремовую текстуру и острый пряный вкус.`,
    
    'grana-padano': `${product.title} производится в долине реки По в северной Италии и имеет статус DOP с 1996 года. История этого сыра насчитывает более 900 лет - он был создан монахами-цистерцианцами, которые искали способ консервации излишков молока. Сыр изготавливается из частично обезжиренного коровьего молока и созревает минимум 9 месяцев. Особенность производства - использование натуральной закваски из сыворотки предыдущего дня, что создает уникальную микрофлору каждого производителя. Твердая текстура и характерный зернистый вкус формируются благодаря медленному длительному созреванию.`,
    
    'comte': `${product.title} производится в регионе Франш-Конте на востоке Франции и является одним из самых популярных французских сыров AOP. Каждое лето коровы пасутся на альпийских лугах на высоте более 1000 метров, где разнотравье придает молоку особый аромат. Сыр изготавливается в небольших кооперативных сыроварнях (frutières) только из сырого молока местных пород коров. Процесс созревания может длиться от 4 до 18 месяцев в специальных погребах с известковыми стенами, которые поддерживают оптимальный микроклимат. Чем дольше созревание, тем более выражен ореховый вкус и кристаллическая структура.`,
    
    'gruyere': `${product.title} - знаменитый швейцарский сыр из региона Грюйер в кантоне Фрибур. Производится в небольших сыроварнях в горах на высоте от 800 до 1100 метров над уровнем моря. Сыр изготавливается из сырого коровьего молока альпийских пород, которые пасутся на богатых альпийских лугах. Традиционный метод включает нагревание молока в медных чанах и использование натуральной закваски. Сыр созревает в прохладных влажных погребах от 5 до 12 месяцев, в течение которых его регулярно переворачивают и солят вручную. Благодаря альпийскому климату и традиционным методам сыр приобретает свой характерный сладковато-ореховый вкус и небольшие дырки.`
  }
  
  // Если есть специфическое описание для этого продукта - используем его
  if (specificDescriptions[slug]) {
    return specificDescriptions[slug]
  }
  
  // Генерируем индивидуальное описание на основе характеристик продукта
  let description = `${product.title} производится в регионе ${regionName}`
  
  // Добавляем информацию о регионе
  const regionInfo: Record<string, string> = {
    'FR': 'знаменитом своими многовековыми традициями сыроделия',
    'IT': 'где мастерство сыроделов передается из поколения в поколение',
    'ES': 'сохраняющем древние рецепты гастрономического наследия',
    'CH': 'в высокогорных альпийских условиях',
    'DE': 'с многовековой историей производства',
    'GR': 'с традициями, уходящими в античную эпоху'
  }
  
  if (regionInfo[regionCode]) {
    description += `, ${regionInfo[regionCode]}`
  }
  
  description += '. '
  
  // Добавляем специфическую информацию в зависимости от характеристик
  if (isSoft && isBloomy) {
    description += `Этот мягкий сыр с благородной плесенью изготавливается из цельного коровьего молока и созревает в специальных погребах с контролируемой влажностью. `
  } else if (isHard) {
    const ageInfo = isAged ? 'длительного созревания' : 'традиционный'
    description += `Этот ${ageInfo} твердый сыр производится по классической рецептуре с использованием только натуральных ингредиентов. `
  } else if (tags.includes('ham')) {
    description += `Ветчина изготавливается из отборного мяса местных пород свиней по традиционным методам, включающим длительное вяление и созревание. `
  }
  
  // Добавляем информацию о производстве в зависимости от региона
  const productionInfo: Record<string, string> = {
    'FR': 'Производство осуществляется в небольших семейных сыроварнях под строгим контролем, где каждый этап тщательно контролируется. Климат и уникальные почвы этого региона создают особые условия, которые отражаются в неповторимом вкусе и текстуре продукта.',
    'IT': 'Итальянские мастера строго следуют оригинальным рецептам, многие из которых имеют защищенное обозначение происхождения (DOP). Продукт изготавливается в провинциальных мастерских с использованием методов, сохранившихся с древних времен.',
    'ES': 'Испанские производители используют традиционные методы, включающие длительное созревание и особые техники обработки. Климатические условия региона придают продукту уникальные характеристики.',
    'CH': 'Швейцарские мастера применяют только премиальные ингредиенты и соблюдают строжайшие стандарты качества. Чистый альпийский воздух и особые условия горных пастбищ создают идеальную среду для производства.',
    'DE': 'Немецкие производители сочетают классические рецепты с современными методами контроля качества. Традиции мастерства бережно сохраняются на протяжении многих поколений.',
    'GR': 'Греческие мастера используют методы, применявшиеся еще в античные времена. Продукт производится в семейных хозяйствах с использованием натуральных ингредиентов.'
  }
  
  description += productionInfo[regionCode] || 'Местные мастера используют проверенные временем рецепты и только натуральные ингредиенты.'
  
  return description
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [highlightedRegions, setHighlightedRegions] = useState<string[]>([])
  const searchParams = useSearchParams()
  const router = useRouter()
  const productSlug = searchParams.get('product')
  const regionsParam = searchParams.get('regions') // Получаем регионы из query параметра

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.regions.getAll(),
  })

  const { data: singleProduct } = useQuery({
    queryKey: ['product', productSlug],
    queryFn: () => api.products.getBySlug(productSlug!),
    enabled: !!productSlug && !!selectedRegion,
  })

  // Проверяем, совпадает ли регион продукта с выбранным регионом
  const shouldShowSingleProduct = singleProduct && selectedRegion && singleProduct.region_code === selectedRegion

  const { data: regionProducts } = useQuery({
    queryKey: ['region-products', selectedRegion],
    queryFn: () => api.products.getByRegion(selectedRegion!),
    enabled: !!selectedRegion && !shouldShowSingleProduct, // Загружаем, если не показываем конкретный продукт
  })

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedRegion(null)
    // Очищаем product из URL при закрытии
    if (productSlug) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('product')
      router.push(`/map?${params.toString()}`)
    }
  }

  const handleMarkerClick = (regionCode: string) => {
    if (selectedRegion === regionCode && showModal) {
      // Если кликнули на тот же регион и модальное окно открыто - закрываем
      handleCloseModal()
      // Очищаем product из URL при закрытии
      if (productSlug) {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('product')
        router.push(`/map?${params.toString()}`)
      }
    } else {
      // Если кликнули на другой регион - обновляем и показываем модальное окно
      setSelectedRegion(regionCode)
      setShowModal(true)
      // Если есть product в URL, но регион не совпадает - очищаем product
      if (productSlug) {
        const regionParam = searchParams.get('region')
        if (regionParam !== regionCode) {
          router.push(`/map?region=${regionCode}`)
        }
      }
    }
  }

  const formatPrice = (cents: number) => {
    return `${(cents / 100).toLocaleString('ru-RU')} ₽`
  }

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'simple-tiles',
          type: 'raster',
          source: 'raster-tiles',
          minzoom: 0,
          maxzoom: 22
        }]
      },
      center: [10, 50],
      zoom: 4,
      attributionControl: false
    })

    map.current.on('load', () => setIsMapLoaded(true))

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  useEffect(() => {
    const regionParam = searchParams.get('region')
    
    // Обрабатываем множественные регионы из query параметра (например, ?regions=IT,FR,ES)
    if (regionsParam && map.current && regions) {
      const regionCodes = regionsParam.split(',').map(r => r.trim()).filter(r => r)
      setHighlightedRegions(regionCodes)
      
      // Если есть несколько регионов, центрируем карту чтобы показать все
      if (regionCodes.length > 0) {
        const validCoords = regionCodes
          .map(code => cities[code])
          .filter(coord => coord !== undefined)
        
        if (validCoords.length > 0) {
          // Вычисляем центр всех регионов
          const centerLng = validCoords.reduce((sum, [lng]) => sum + lng, 0) / validCoords.length
          const centerLat = validCoords.reduce((sum, [, lat]) => sum + lat, 0) / validCoords.length
          
          map.current.flyTo({ 
            center: [centerLng, centerLat], 
            zoom: regionCodes.length > 1 ? 5 : 6, 
            duration: 1000 
          })
        }
      }
      return
    }
    
    // Обрабатываем одиночный регион
    if (regionParam && map.current && regions) {
      const coords = cities[regionParam]
      if (coords) {
        map.current.flyTo({ center: coords, zoom: 6, duration: 1000 })
        setSelectedRegion(regionParam)
        setShowModal(true)
        
        // Если есть product в URL, но регион продукта не совпадает с выбранным регионом - очищаем product
        if (productSlug && singleProduct && singleProduct.region_code !== regionParam) {
          router.push(`/map?region=${regionParam}`)
        }
      }
    } else {
      // Очищаем выделенные регионы если нет параметров
      setHighlightedRegions([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, regions, singleProduct, regionsParam])


  useEffect(() => {
    if (!map.current || !isMapLoaded || !regions) return

    const geojson = {
      type: 'FeatureCollection' as const,
      features: regions.map(region => ({
        type: 'Feature' as const,
        properties: { code: region.code, name: region.name },
        geometry: JSON.parse(region.geojson_feature).geometry
      }))
    }

    map.current.addSource('regions', { type: 'geojson', data: geojson })
    
    // Слой для выделенных регионов (если есть)
    if (highlightedRegions.length > 0) {
      const highlightedFeatures = geojson.features.filter((f: any) => 
        highlightedRegions.includes(f.properties.code)
      )
      const highlightedGeoJson = {
        ...geojson,
        features: highlightedFeatures
      }
      
      map.current.addSource('highlighted-regions', { type: 'geojson', data: highlightedGeoJson })
      map.current.addLayer({
        id: 'highlighted-regions-fill',
        type: 'fill',
        source: 'highlighted-regions',
        paint: { 
          'fill-color': '#22d3ee', 
          'fill-opacity': 0.3 
        }
      })
      map.current.addLayer({
        id: 'highlighted-regions-stroke',
        type: 'line',
        source: 'highlighted-regions',
        paint: { 
          'line-color': '#06b6d4', 
          'line-width': 3 
        }
      })
    }
    
    // Обычный слой для всех регионов
    map.current.addLayer({
      id: 'regions-fill',
      type: 'fill',
      source: 'regions',
      paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.1 }
    })
    map.current.addLayer({
      id: 'regions-stroke',
      type: 'line',
      source: 'regions',
      paint: { 'line-color': '#3b82f6', 'line-width': 1 }
    })

    return () => {
      if (map.current) {
        if (map.current.getLayer('highlighted-regions-fill')) map.current.removeLayer('highlighted-regions-fill')
        if (map.current.getLayer('highlighted-regions-stroke')) map.current.removeLayer('highlighted-regions-stroke')
        if (map.current.getSource('highlighted-regions')) map.current.removeSource('highlighted-regions')
        if (map.current.getLayer('regions-fill')) map.current.removeLayer('regions-fill')
        if (map.current.getLayer('regions-stroke')) map.current.removeLayer('regions-stroke')
        if (map.current.getSource('regions')) map.current.removeSource('regions')
      }
    }
  }, [isMapLoaded, regions, highlightedRegions])


  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
      
      {isMapLoaded && map.current && regions?.map(region => {
        const coords = cities[region.code]
        if (!coords) return null
        const isHighlighted = highlightedRegions.includes(region.code)
        return (
          <MapMarker
            key={region.code}
            map={map.current!}
            position={coords}
            regionCode={region.code}
            regionName={region.name}
            isSelected={selectedRegion === region.code || isHighlighted}
            onClick={() => handleMarkerClick(region.code)}
          />
        )
      })}

      {showModal && selectedRegion && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div 
            className={`bg-white rounded-2xl shadow-2xl ${shouldShowSingleProduct ? 'max-w-4xl' : 'max-w-2xl'} w-full max-h-[80vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {shouldShowSingleProduct ? singleProduct?.title : regions?.find(r => r.code === selectedRegion)?.name}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {shouldShowSingleProduct ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Левая колонка - фото */}
                  {singleProduct?.images?.[0] && (
                    <div className="aspect-square relative bg-neutral-100 rounded-lg overflow-hidden">
                      <Image 
                        src={singleProduct.images[0]} 
                        alt={singleProduct.title} 
                        fill 
                        className="object-cover" 
                      />
                    </div>
                  )}
                  
                  {/* Правая колонка - информация о происхождении */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{singleProduct.title}</h3>
                      <p className="text-lg font-semibold text-primary mb-4">
                        {formatPrice(singleProduct.price_cents)}
                      </p>
                    </div>
                    
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="text-lg font-semibold flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-primary" />
                        История происхождения
                      </h4>
                      
                      <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Регион:</span>
                          <span className="font-medium">{regions?.find(r => r.code === selectedRegion)?.name || singleProduct.region_code}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Код региона:</span>
                          <span className="font-medium">{singleProduct.region_code}</span>
                        </div>
                        {singleProduct.tags && singleProduct.tags.length > 0 && (
                          <div className="flex items-start justify-between">
                            <span className="text-sm text-muted-foreground">Характеристики:</span>
                            <div className="flex flex-wrap gap-2 justify-end">
                              {singleProduct.tags.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-white rounded-full text-xs font-medium border">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {singleProduct && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {generateOriginDescription(
                              singleProduct, 
                              regions?.find(r => r.code === selectedRegion)?.name || singleProduct.region_code
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button asChild className="w-full" size="lg">
                        <Link href={`/shop/${singleProduct.slug}`}>
                          Подробнее о товаре
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : regionProducts?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Нет товаров для этого региона</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regionProducts?.map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop/${product.slug}`}
                      onClick={() => setShowModal(false)}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      {product.images?.[0] && (
                        <div className="aspect-square relative bg-neutral-100">
                          <Image src={product.images[0]} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                        <p className="text-lg font-bold text-primary">{formatPrice(product.price_cents)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
