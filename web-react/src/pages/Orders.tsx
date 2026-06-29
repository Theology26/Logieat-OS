import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const rp = (v: number) => 'Rp ' + Number(v).toLocaleString('id-ID');

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = () => api.orders().then(setOrders).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="page-h">
        <div><h1>Pesanan</h1><p>{orders.length} pesanan</p></div>
        <button className="btn" onClick={() => setOpen(true)}>+ Tambah Pesanan</button>
      </div>
      {loading ? <div className="spinner" /> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead><tr><th>Kode</th><th>Penerima</th><th>Menu</th><th>Kategori</th><th>Qty</th><th>Harga</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.code}</td>
                  <td>{o.recipient_name}</td>
                  <td>{o.menu_name}</td>
                  <td>{o.food_category || '—'}</td>
                  <td className="mono">{o.quantity}</td>
                  <td className="mono">{rp(o.price)}</td>
                  <td><span className={'chip ' + o.status}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <OrderModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); setLoading(true); load(); }} />}
    </>
  );
}

function OrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ RecipientName: '', Menu: '', FoodCategory: 'Basah', Quantity: 30, Price: 450000, Address: '', Latitude: -6.21, Longitude: 106.85 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setBusy(true); setErr('');
    try { await api.createOrder(f); onSaved(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Tambah Pesanan</h3>
        <div className="field"><label>Penerima</label><input className="input" value={f.RecipientName} onChange={(e) => set('RecipientName', e.target.value)} /></div>
        <div className="field"><label>Menu</label><input className="input" value={f.Menu} onChange={(e) => set('Menu', e.target.value)} /></div>
        <div className="row2">
          <div className="field"><label>Kategori</label>
            <select className="input" value={f.FoodCategory} onChange={(e) => set('FoodCategory', e.target.value)}>
              <option>Santan</option><option>Basah</option><option>Kering</option>
            </select>
          </div>
          <div className="field"><label>Jumlah (pax)</label><input className="input" type="number" value={f.Quantity} onChange={(e) => set('Quantity', +e.target.value)} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Harga (Rp)</label><input className="input" type="number" value={f.Price} onChange={(e) => set('Price', +e.target.value)} /></div>
          <div className="field"><label>Alamat</label><input className="input" value={f.Address} onChange={(e) => set('Address', e.target.value)} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Latitude</label><input className="input" type="number" step="0.0001" value={f.Latitude} onChange={(e) => set('Latitude', +e.target.value)} /></div>
          <div className="field"><label>Longitude</label><input className="input" type="number" step="0.0001" value={f.Longitude} onChange={(e) => set('Longitude', +e.target.value)} /></div>
        </div>
        {err && <div className="err">{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn" style={{ flex: 1 }} disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}
