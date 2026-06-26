import { Head } from '@inertiajs/react';
import { useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';
import Layout from '../Layout';

const rp = (v) => 'Rp ' + Number(v).toLocaleString('id-ID');
const shortRp = (v) => (v >= 1e6 ? v / 1e6 + 'jt' : v >= 1e3 ? v / 1e3 + 'rb' : v);
const GRAN = [['day', 'Hari'], ['month', 'Bulan'], ['sixmo', '6 Bln'], ['year', 'Tahun']];
const tooltipStyle = { background: '#232329', border: '1px solid #2a2a2a', borderRadius: 8, color: '#f2f2f4', fontSize: 12 };

export default function Statistik({ kpis, trend, couriers }) {
    const [gran, setGran] = useState('month');
    const data = trend[gran];

    const tiles = [
        ['Penjualan Hari Ini', rp(kpis.sales_today)],
        ['Pesanan Hari Ini', kpis.orders_today],
        ['Total Terkirim', kpis.deliveries],
        ['On-Time', kpis.on_time_pct + '%'],
        ['Jarak Armada', kpis.fleet_km + ' km'],
    ];

    return (
        <Layout active="statistik">
            <Head title="Statistik" />
            <h1 className="text-2xl font-semibold mb-1">Statistik</h1>
            <p className="text-ink2 mb-6">Penjualan, performa, dan rekap kurir.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {tiles.map(([label, value]) => (
                    <div key={label} className="bg-card border border-line rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-wide text-ink2 font-semibold">{label}</div>
                        <div className="font-mono text-2xl font-semibold mt-2">{value}</div>
                    </div>
                ))}
            </div>

            {/* trend */}
            <div className="bg-card border border-line rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold">Tren Penjualan</span>
                    <div className="flex bg-pop rounded-md p-0.5 text-xs">
                        {GRAN.map(([k, label]) => (
                            <button
                                key={k}
                                onClick={() => setGran(k)}
                                className={`px-3 py-1 rounded ${gran === k ? 'bg-accent text-[#1a1206] font-semibold' : 'text-ink2'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data} margin={{ left: 6, right: 10, top: 10 }}>
                        <defs>
                            <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#e8b54a" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#e8b54a" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="label" stroke="#9a9aa6" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis stroke="#9a9aa6" fontSize={11} tickLine={false} axisLine={false} tickFormatter={shortRp} width={48} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [rp(v), 'Penjualan']} labelStyle={{ color: '#9a9aa6' }} />
                        <Area type="monotone" dataKey="sales" stroke="#e8b54a" strokeWidth={2.5} fill="url(#gSales)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* courier recap */}
            <div className="bg-card border border-line rounded-xl p-5">
                <div className="font-semibold mb-4">Rekap Kurir · jarak tempuh</div>
                {couriers.length === 0 ? (
                    <div className="text-ink2 text-sm">Belum ada data kurir.</div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={Math.max(120, couriers.length * 48)}>
                            <BarChart data={couriers} layout="vertical" margin={{ left: 8, right: 16 }}>
                                <CartesianGrid stroke="#2a2a2a" horizontal={false} />
                                <XAxis type="number" stroke="#9a9aa6" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#9a9aa6" fontSize={12} tickLine={false} axisLine={false} width={72} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(82,100,174,0.1)' }} formatter={(v) => [v + ' km', 'Jarak']} />
                                <Bar dataKey="km" fill="#e8b54a" radius={[0, 6, 6, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-3 border-t border-line pt-3 flex flex-col gap-1">
                            {couriers.map((c) => (
                                <div key={c.name} className="flex justify-between text-sm">
                                    <span className="text-ink">{c.name}</span>
                                    <span className="font-mono text-ink2">{c.deliveries} antar · {c.km} km</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
