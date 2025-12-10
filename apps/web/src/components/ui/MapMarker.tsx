"use client"

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'

interface MapMarkerProps {
  map: maplibregl.Map
  position: [number, number]
  regionCode: string
  regionName: string
  isSelected?: boolean
  onClick: () => void
}

export function MapMarker({ map, position, regionCode, regionName, isSelected, onClick }: MapMarkerProps) {
  const markerRef = useRef<HTMLDivElement>(null)
  const marker = useRef<maplibregl.Marker | null>(null)

  useEffect(() => {
    if (!markerRef.current) return

    const el = markerRef.current

    const markerInstance = new maplibregl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(position)
      .addTo(map)

    marker.current = markerInstance

    return () => {
      markerInstance.remove()
    }
  }, [map, position])

  useEffect(() => {
    if (!markerRef.current) return
    
    const el = markerRef.current
    el.onclick = onClick
  }, [onClick])

  return (
    <div ref={markerRef}>
      <div 
        className={`
          w-6 h-6 rounded-full bg-red-600 border-2 border-white 
          shadow-lg transition-all duration-200 cursor-pointer
          ${isSelected ? 'scale-125 ring-4 ring-red-200' : 'hover:scale-110'}
        `}
        title={regionName}
      />
    </div>
  )
}




























