import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import Layout from '../Layout';

export default function Couriers({ couriers, cateringCode }) {
    const [copied, setCopied] = useState(false);
    const pending = couriers.filter((c) => c.status === 'pending');
    const others = couriers.filter((c) => c.status !== 'pending');

    const copy = () => {
        navigator.clipboard?.writeText(cateringCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    const act = (id, action) =>
        router.post(`/couriers/${id}/${action}`, {}, { preserveScroll: true });

    return (
        <Layout active="couriers">
            <Head title="Kurir" />
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Kurir</h1>
                    <p className="text-ink2">Setujui pendaftaran &amp; kelola armada.</p>
                </div>
                {/* Catering ID to share */}
                <div className="bg-card border border-line rounded-xl px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">Catering ID (bagikan ke kurir)</div>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-lg text-accentt">{cateringCode}</span>
                        <button onClick={copy} className="text-xs px-2.5 py-1 rounded-full border border-line2 text-ink2 hover:text-ink">
                            {copied ? '✓ Tersalin' : 'Salin'}
                        </button>
                    </div>
                </div>
            </div>

            {/* pending */}
            <h2 className="text-sm font-semibold text-warning mb-3">Menunggu Persetujuan ({pending.length})</h2>
            <div className="bg-card border border-line rounded-xl overflow-hidden mb-8">
                {pending.length === 0 && <div className="p-6 text-ink2 text-sm">Tidak ada permintaan baru.</div>}
                {pending.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                        <Avatar name={c.name} />
                        <div className="flex-1">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-ink2 text-xs">{c.phone}{c.vehicle_plate ? ` · ${c.vehicle_plate}` : ''}{c.email ? ` · ${c.email}` : ''}</div>
                        </div>
                        <button onClick={() => act(c.id, 'reject')} className="h-9 px-4 rounded-full border border-line2 text-ink2 hover:text-danger hover:border-danger text-sm transition">Tolak</button>
                        <button onClick={() => act(c.id, 'approve')} className="h-9 px-4 rounded-full bg-accent hover:bg-accenth text-[#1a1206] text-sm font-semibold transition">Setujui</button>
                    </div>
                ))}
            </div>

            {/* others */}
            <h2 className="text-sm font-semibold text-ink2 mb-3">Semua Kurir ({others.length})</h2>
            <div className="bg-card border border-line rounded-xl overflow-hidden">
                {others.length === 0 && <div className="p-6 text-ink2 text-sm">Belum ada kurir aktif.</div>}
                {others.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                        <Avatar name={c.name} />
                        <div className="flex-1">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-ink2 text-xs">{c.phone}{c.vehicle_plate ? ` · ${c.vehicle_plate}` : ''}</div>
                        </div>
                        <StatusBadge status={c.status} />
                    </div>
                ))}
            </div>
        </Layout>
    );
}

function Avatar({ name }) {
    const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return <div className="w-9 h-9 rounded-full bg-accent/20 text-accentt flex items-center justify-center text-xs font-semibold">{initials}</div>;
}
function StatusBadge({ status }) {
    const map = { active: 'text-success bg-success/15', rejected: 'text-danger bg-danger/15', suspended: 'text-warning bg-warning/15' };
    return <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded ${map[status] || 'text-ink2 bg-pop'}`}>{status}</span>;
}
