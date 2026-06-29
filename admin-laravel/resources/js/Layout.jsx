import { Link, usePage, router } from '@inertiajs/react';
import ThemeSwitch from './ThemeSwitch';

const NAV = [
    ['dashboard', 'Beranda', '/dashboard'],
    ['orders', 'Pesanan', '/orders'],
    ['dispatch', 'Dispatch', '/dispatch'],
    ['fleet', 'Armada', '/fleet'],
    ['couriers', 'Kurir', '/couriers'],
    ['statistik', 'Statistik', '/statistik'],
];

export default function Layout({ active, children }) {
    const { auth, flash } = usePage().props;

    return (
        <div className="min-h-screen bg-bg text-ink">
            <nav className="flex items-center gap-6 h-14 px-6 border-b border-line bg-bg/80 backdrop-blur sticky top-0 z-20">
                <span className="font-semibold text-accentt">LogiEat OS</span>
                {NAV.map(([key, label, href]) => (
                    <Link
                        key={key}
                        href={href}
                        className={
                            active === key
                                ? 'text-ink font-medium border-b-2 border-accent pb-[18px] -mb-[18px]'
                                : 'text-ink2 hover:text-ink transition'
                        }
                    >
                        {label}
                    </Link>
                ))}
                <div className="ml-auto flex items-center gap-4 text-sm text-ink2">
                    <span>{auth?.company?.name}</span>
                    <ThemeSwitch />
                    <button onClick={() => router.post('/logout')} className="hover:text-danger transition">
                        Keluar
                    </button>
                </div>
            </nav>

            {flash?.message && (
                <div className="max-w-6xl mx-auto mt-4 px-4 py-2.5 rounded-lg bg-success/15 border border-success/30 text-success text-sm">
                    {flash.message}
                </div>
            )}

            <main className="max-w-6xl mx-auto p-6">{children}</main>
        </div>
    );
}

export function Chip({ risk, children }) {
    const map = {
        critical: 'text-rc bg-rc/15',
        high: 'text-rh bg-rh/15',
        medium: 'text-rm bg-rm/15',
        low: 'text-rl bg-rl/15',
    };
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${map[risk] || 'text-ink2 bg-pop'}`}>
            {children || risk}
        </span>
    );
}
