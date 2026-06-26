import { Head, useForm } from '@inertiajs/react';
import Layout, { Chip } from '../Layout';

export default function Orders({ orders }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        recipient_name: '', menu_name: '', food_category: 'Basah',
        quantity: 1, price: '', address: '', latitude: '', longitude: '', deadline_at: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/orders', { onSuccess: () => reset() });
    };

    return (
        <Layout active="orders">
            <Head title="Pesanan" />
            <h1 className="text-2xl font-semibold mb-1">Pesanan</h1>
            <p className="text-ink2 mb-6">Daftar pesanan masuk &amp; input pesanan baru.</p>

            <div className="grid md:grid-cols-[1.4fr_1fr] gap-6">
                {/* list */}
                <div className="bg-card border border-line rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-line font-semibold flex justify-between">
                        <span>Pesanan</span><span className="text-ink2 text-sm font-normal">{orders.length} total</span>
                    </div>
                    {orders.length === 0 && <div className="p-6 text-ink2 text-sm">Belum ada pesanan.</div>}
                    {orders.map((o) => (
                        <div key={o.id} className="flex items-center gap-3 px-4 py-3 border-b border-line text-sm last:border-0">
                            <span className="font-mono text-ink2 text-xs">{o.code}</span>
                            <span className="flex-1">{o.recipient_name} · <span className="text-ink2">{o.menu_name}</span></span>
                            {o.spoilage_risk && <Chip risk={o.spoilage_risk} />}
                            <span className="font-mono text-ink2 text-xs">{o.quantity} pax</span>
                            <StatusBadge status={o.status} />
                        </div>
                    ))}
                </div>

                {/* form */}
                <form onSubmit={submit} className="bg-card border border-line rounded-xl p-5 h-fit">
                    <div className="font-semibold mb-3">+ Tambah Pesanan</div>
                    <Input label="Penerima" value={data.recipient_name} onChange={(v) => setData('recipient_name', v)} error={errors.recipient_name} />
                    <Input label="Menu" value={data.menu_name} onChange={(v) => setData('menu_name', v)} error={errors.menu_name} />
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Kategori" value={data.food_category} onChange={(v) => setData('food_category', v)} options={['Santan', 'Basah', 'Kering']} />
                        <Input label="Jumlah (pax)" type="number" value={data.quantity} onChange={(v) => setData('quantity', v)} error={errors.quantity} />
                    </div>
                    <Input label="Harga (Rp)" type="number" value={data.price} onChange={(v) => setData('price', v)} error={errors.price} />
                    <Input label="Alamat" value={data.address} onChange={(v) => setData('address', v)} error={errors.address} />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Latitude" value={data.latitude} onChange={(v) => setData('latitude', v)} error={errors.latitude} />
                        <Input label="Longitude" value={data.longitude} onChange={(v) => setData('longitude', v)} error={errors.longitude} />
                    </div>
                    <Input label="Batas antar" type="datetime-local" value={data.deadline_at} onChange={(v) => setData('deadline_at', v)} error={errors.deadline_at} />
                    <button disabled={processing} className="mt-4 w-full h-11 rounded-full bg-accent hover:bg-accenth text-[#1a1206] font-semibold transition disabled:opacity-60">
                        {processing ? 'Menyimpan…' : 'Simpan Pesanan'}
                    </button>
                </form>
            </div>
        </Layout>
    );
}

function StatusBadge({ status }) {
    const map = { pending: 'text-ink2 bg-pop', assigned: 'text-accentt bg-accent/15', delivered: 'text-rl bg-rl/15', cancelled: 'text-rc bg-rc/15' };
    return <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${map[status] || 'text-ink2 bg-pop'}`}>{status}</span>;
}
function Input({ label, type = 'text', value, onChange, error }) {
    return (
        <div className="mt-3">
            <label className="block text-xs text-ink2 mb-1">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-pop border border-line2 text-ink outline-none focus:border-accent transition" />
            {error && <div className="text-danger text-xs mt-1">{error}</div>}
        </div>
    );
}
function Select({ label, value, onChange, options }) {
    return (
        <div className="mt-3">
            <label className="block text-xs text-ink2 mb-1">{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-pop border border-line2 text-ink outline-none focus:border-accent transition">
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}
