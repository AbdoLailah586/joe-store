import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import { coordsForGovernorate } from '../utils/egyptLocation';

const PIN_ICON = L.divIcon({
  className: 'joe-map-pin-wrapper',
  html: `<div style="position:relative;width:36px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.32));">
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 1C8.163 1 1 8.163 1 17C1 28.5 17 41 17 41C17 41 33 28.5 33 17C33 8.163 25.837 1 17 1Z" fill="#f59e0b" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="17" cy="17" r="6" fill="#0f172a"/>
    </svg>
  </div>`,
  iconSize: [36, 44],
  iconAnchor: [18, 42]
});

interface LocationPickerMapProps {
  governorate: string;
  latitude?: number;
  longitude?: number;
  onSelectCoords: (lat: number, lng: number) => void;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  governorate,
  latitude,
  longitude,
  onSelectCoords
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelectCoords);
  onSelectRef.current = onSelectCoords;

  const fallbackCenter = useMemo<[number, number]>(
    () => coordsForGovernorate(governorate),
    [governorate]
  );

  const hasExactCoords =
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = hasExactCoords ? [latitude!, longitude!] : fallbackCenter;
    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: hasExactCoords ? 16 : 13,
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: true
    });

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const placeMarker = (lat: number, lng: number, pan = false) => {
      if (!markerRef.current) {
        const marker = L.marker([lat, lng], { icon: PIN_ICON, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onSelectRef.current(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
      if (pan) {
        map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
      }
    };

    if (hasExactCoords) placeMarker(latitude!, longitude!, false);

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng, true);
      onSelectRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    const timer = window.setTimeout(() => map.invalidateSize(), 160);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (hasExactCoords) {
      if (!markerRef.current) {
        const marker = L.marker([latitude!, longitude!], { icon: PIN_ICON, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onSelectRef.current(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng([latitude!, longitude!]);
      }
      map.setView([latitude!, longitude!], Math.max(map.getZoom(), 15), { animate: true });
    } else {
      map.setView(fallbackCenter, 13, { animate: true });
    }
  }, [hasExactCoords, latitude, longitude, fallbackCenter]);

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-amber-300 shadow-sm bg-slate-100">
        <div ref={containerRef} className="w-full h-64 sm:h-72 z-0" />
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-[400] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1 text-[11px] font-bold text-slate-900 shadow-sm flex items-center gap-1.5">
          <LocateFixed className="w-3.5 h-3.5 text-amber-600" />
          <span>اضغط على الخريطة أو اسحب العلامة لتحديد مكانك بدقة</span>
        </div>
      </div>
      {hasExactCoords && (
        <p className="text-[11px] font-bold text-emerald-700" dir="ltr">
          ✓ الإحداثيات المختارة: {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default LocationPickerMap;
