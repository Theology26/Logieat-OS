import { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Layout from '../Layout';

const STYLE = {
    version: 8,
    sources: { c: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256 } },
    layers: [{ id: 'c', type: 'raster', source: 'c' }],
};

function dot(color, size) {
    const el = document.createElement('div');
    el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #000;box-shadow:0 0 0 4px ${color}33`;
    return el;
}

export default function Fleet({ couriers, locations, depot, wsUrl, wsToken }) {
    const mapRef = useRef(null);
    const markers = useRef({});
    const wsRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const nameById = Object.fromEntries(couriers.map((c) => [c.id, c.name]));

    const upsert = (id, lng, lat) => {
        const map = mapRef.current;
        if (!map || lng == null) return;
        let m = markers.current[id];
        if (!m) {
            const el = dot('#e8b54a', 26);
            el.title = nameById[id] || 'Kurir';
            m = new maplibregl.Marker({ element: el });
            markers.current[id] = m;
            m.addTo(map);
        }
        m.setLngLat([lng, lat]);
    };

    // map
    useEffect(() => {
        const map = new maplibregl.Map({
            container: 'map', style: STYLE,
            center: depot?.lng ? [depot.lng, depot.lat] : [106.84, -6.2], zoom: 12, attributionControl: false,
        });
        mapRef.current = map;
        map.on('load', () => {
            if (depot?.lat) new maplibregl.Marker({ element: dot('#ffd277', 18) }).setLngLat([depot.lng, depot.lat]).addTo(map);
            locations.forEach((l) => upsert(l.courier_id, l.longitude, l.latitude));
        });
        return () => map.remove();
    }, []);

    // realtime
    useEffect(() => {
        const ws = new WebSocket(`${wsUrl}?token=${wsToken}`);
        wsRef.current = ws;
        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.type === 'gps') upsert(m.courier_id, m.lng, m.lat);
            else if (m.type === 'chat') setMessages((p) => [...p, m]);
        };
        return () => ws.close();
    }, []);

    const send = () => {
        const body = text.trim();
        if (!body || !wsRef.current) return;
        wsRef.current.send(JSON.stringify({ type: 'chat', body }));
        setText('');
    };

    return (
        <Layout active="fleet">
            <Head title="Armada" />
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-semibold">Armada Live</h1>
                    <p className="text-ink2">Posisi kurir real-time + chat.</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${connected ? 'text-success bg-success/15' : 'text-ink2 bg-pop'}`}>
                    {connected ? '● Live' : '○ Menghubungkan…'}
                </span>
            </div>

            <div className="grid md:grid-cols-[1.6fr_1fr] gap-4">
                <div id="map" className="rounded-xl overflow-hidden border border-line" style={{ height: 460 }} />

                <div className="bg-card border border-line rounded-xl flex flex-col" style={{ height: 460 }}>
                    <div className="px-4 py-3 border-b border-line font-semibold text-sm">Chat Armada</div>
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {messages.length === 0 && <div className="text-ink2 text-sm">Belum ada pesan. Kirim ke kurir di lapangan.</div>}
                        {messages.map((m, i) => {
                            const mine = m.sender_role === 'owner' || m.sender_role === 'admin';
                            return (
                                <div key={i} className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${mine ? 'self-end bg-accent text-[#1a1206]' : 'self-start bg-pop text-ink border border-line'}`}>
                                    {m.body}
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-3 border-t border-line flex gap-2">
                        <input
                            value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                            placeholder="Pesan ke kurir…"
                            className="flex-1 h-10 px-3 rounded-full bg-pop border border-line2 text-ink text-sm outline-none focus:border-accent"
                        />
                        <button onClick={send} className="w-10 h-10 rounded-full bg-accent text-[#1a1206]">➤</button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
