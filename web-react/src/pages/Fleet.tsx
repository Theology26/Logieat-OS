import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '../lib/api';
import { connectWs } from '../lib/ws';

export default function Fleet() {
  const elRef = useRef<HTMLDivElement>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const [count, setCount] = useState(0);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: elRef.current!,
      style: {
        version: 8,
        sources: { c: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [{ id: 'c', type: 'raster', source: 'c' }],
      },
      center: [106.84, -6.2], zoom: 12, attributionControl: false,
    });
    const dot = (color: string, size = 22) => {
      const e = document.createElement('div');
      e.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #000;box-shadow:0 0 0 5px rgba(232,181,74,.3)`;
      return e;
    };
    const upd = (id: string, lng: number, lat: number) => {
      if (!markers.current[id]) markers.current[id] = new maplibregl.Marker({ element: dot('#e8b54a') }).setLngLat([lng, lat]).addTo(map);
      else markers.current[id].setLngLat([lng, lat]);
    };
    api.fleet().then((f) => {
      if (f.depot && f.depot.lat) {
        new maplibregl.Marker({ element: dot('#ffd277', 16) }).setLngLat([f.depot.lng, f.depot.lat]).addTo(map);
        map.setCenter([f.depot.lng, f.depot.lat]);
      }
      f.locations.forEach((l) => upd(l.courier_id, l.longitude, l.latitude));
      setCount(f.locations.length);
    }).catch(() => {});
    const off = connectWs((m) => {
      if (m.type === 'gps') { upd(m.courier_id, m.lng, m.lat); setCount(Object.keys(markers.current).length); }
    });
    return () => { off(); map.remove(); markers.current = {}; };
  }, []);

  return (
    <>
      <div className="page-h"><div><h1>Armada Live</h1><p>{count} kurir terlacak · update real-time via WebSocket (Go)</p></div></div>
      <div className="mapwrap"><div id="map" ref={elRef} /></div>
    </>
  );
}
