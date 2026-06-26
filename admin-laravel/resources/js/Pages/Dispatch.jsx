import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Layout, { Chip } from '../Layout';

export default function Dispatch({ couriers, orders, result }) {
    const { errors } = usePage().props;
    const [courierId, setCourierId] = useState(couriers[0]?.id ?? '');
    const [checked, setChecked] = useState({});
    const [busy, setBusy] = useState(false);

    const selectedIds = orders.filter((o) => checked[o.id]).map((o) => o.id);
    const selectedPax = orders.filter((o) => checked[o.id]).reduce((s, o) => s + o.quantity, 0);

    const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));

    const optimize = () => {
        setBusy(true);
        router.post('/dispatch/optimize', { order_ids: selectedIds, courier_id: courierId },
            { preserveScroll: true, preserveState: true, onFinish: () => setBusy(false) });
    };
    const assign = () => {
        setBusy(true);
        router.post('/dispatch/assign', { order_ids: selectedIds, courier_id: courierId },
            { onFinish: () => setBusy(false) });
    };

    return (
        <Layout active="dispatch">
            <Head title="Dispatch" />
            <h1 className="text-2xl font-semibold mb-1">Dispatcher</h1>
            <p className="text-ink2 mb-6">Pilih kurir &amp; pesanan, lalu biarkan AI menyusun rute optimal.</p>

            <div className="grid md:grid-cols-[1.3fr_1fr] gap-6">
                {/* selection */}
                <div className="bg-card border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                        <span className="font-semibold">Pesanan belum ditugaskan</span>
                        <select value={courierId} onChange={(e) => setCourierId(e.target.value)}
                            className="h-9 px-3 rounded-lg bg-pop border border-line2 text-ink text-sm outline-none focus:border-accent">
                            {couriers.length === 0 && <option value="">(belum ada kurir aktif)</option>}
                            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {orders.length === 0 && <div className="p-6 text-ink2 text-sm">Tidak ada pesanan pending. Tambah di menu Pesanan.</div>}
                    {orders.map((o) => (
                        <label key={o.id} className="flex items-center gap-3 px-4 py-3 border-b border-line text-sm last:border-0 cursor-pointer hover:bg-pop/40">
                            <input type="checkbox" checked={!!checked[o.id]} onChange={() => toggle(o.id)}
                                className="w-4 h-4 accent-[#e8b54a]" />
                            <span className="font-mono text-ink2 text-xs">{o.code}</span>
                            <span className="flex-1">{o.recipient_name} · <span className="text-ink2">{o.menu_name}</span></span>
                            {o.food_category && <span className="text-ink2 text-xs">{o.food_category}</span>}
                            <span className="font-mono text-ink2 text-xs">{o.quantity} pax</span>
                        </label>
                    ))}

                    <div className="px-4 py-3 bg-pop flex items-center justify-between">
                        <span className="text-sm text-ink2">Terpilih: <b className="text-ink">{selectedIds.length}</b> · {selectedPax} pax</span>
                        <button onClick={optimize} disabled={busy || selectedIds.length === 0}
                            className="px-4 h-9 rounded-full bg-accent hover:bg-accenth text-[#1a1206] text-sm font-semibold transition disabled:opacity-50">
                            {busy ? 'Memproses…' : '◈ Optimasi Rute (AI)'}
                        </button>
                    </div>
                    {errors?.order_ids && <div className="px-4 py-2 text-danger text-xs">{errors.order_ids}</div>}
                </div>

                {/* result */}
                <div className="bg-card border border-line rounded-xl overflow-hidden h-fit">
                    <div className="px-4 py-3 border-b border-line font-semibold text-sm text-accentt">
                        ▼ Hasil AI {result?.model_type ? `· ${result.model_type}` : ''}
                    </div>

                    {result?.error && <div className="p-4 text-danger text-sm">{result.error}</div>}

                    {!result && <div className="p-6 text-ink2 text-sm">Belum ada hasil. Pilih pesanan lalu klik Optimasi.</div>}

                    {result?.route?.length > 0 && (
                        <>
                            <div className="divide-y divide-line">
                                {result.route.map((s) => (
                                    <div key={s.sequence} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                        <span><b className="font-mono text-accentt mr-2">{s.sequence}</b>{s.code} {s.recipient}</span>
                                        <span className="font-mono text-ink2 text-xs flex items-center gap-2">
                                            {s.distance_km}km · {Math.round(s.estimated_minutes)}m <Chip risk={s.spoilage_risk}>●</Chip>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-3 bg-pop flex items-center justify-between">
                                <span className="font-mono text-xs text-ink2">{result.total_distance_km}km · {Math.round(result.total_time_minutes)}m · {result.route.length} stop</span>
                                <button onClick={assign} disabled={busy || !courierId}
                                    className="px-4 h-9 rounded-full bg-accent hover:bg-accenth text-[#1a1206] text-sm font-semibold transition disabled:opacity-50">
                                    Kirim ke Kurir →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}
