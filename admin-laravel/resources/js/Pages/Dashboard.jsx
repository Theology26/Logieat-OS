import { Head, Link } from '@inertiajs/react';
import Layout from '../Layout';

export default function Dashboard({ stats }) {
    const kpis = [
        ['Pesanan Pending', stats.orders_pending, 'text-ink'],
        ['Pesanan Ditugaskan', stats.orders_assigned, 'text-ink'],
        ['Kurir Aktif', stats.couriers, 'text-accentt'],
        ['Kurir Pending', stats.couriers_pending, stats.couriers_pending ? 'text-warning' : 'text-ink'],
    ];

    return (
        <Layout active="dashboard">
            <Head title="Beranda" />
            <h1 className="text-2xl font-semibold mb-1">Beranda</h1>
            <p className="text-ink2 mb-6">Ringkasan operasional katering hari ini.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map(([label, value, color]) => (
                    <div key={label} className="bg-card border border-line rounded-xl p-5">
                        <div className="text-[11px] uppercase tracking-wide text-ink2 font-semibold">{label}</div>
                        <div className={`font-mono text-3xl font-semibold mt-2 ${color}`}>{value}</div>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 mt-6">
                <Link href="/orders" className="px-5 h-11 inline-flex items-center rounded-full border border-line2 text-ink hover:border-accentt transition">
                    + Kelola Pesanan
                </Link>
                <Link href="/dispatch" className="px-5 h-11 inline-flex items-center rounded-full bg-accent hover:bg-accenth text-[#1a1206] font-semibold transition">
                    Buka Dispatcher →
                </Link>
            </div>
        </Layout>
    );
}
