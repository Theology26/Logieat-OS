import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Dispatch() {
  const [couriers, setC] = useState<any[]>([]);
  const [orders, setO] = useState<any[]>([]);
  const [courier, setCourier] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    api.couriers().then((cs) => setC(cs.filter((c) => c.status === 'active'))).catch(() => {});
    api.orders().then((os) => setO(os.filter((o) => o.status === 'pending'))).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const totalPax = orders.filter((o) => sel.has(o.id)).reduce((a, o) => a + o.quantity, 0);

  const optimize = async () => {
    setErr(''); setMsg(''); setResult(null); setBusy(true);
    try { setResult(await api.dispatchOptimize({ order_ids: [...sel], temperature: 31 })); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  const assign = async () => {
    setErr(''); setBusy(true);
    try { await api.dispatchAssign({ order_ids: [...sel], courier_id: courier }); setMsg('Tugas terkirim ke kurir!'); setSel(new Set()); setResult(null); load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="page-h"><div><h1>Dispatch AI</h1><p>Pilih kurir & pesanan — AI menyusun rute optimal (model A2C, spoilage-aware)</p></div></div>
      <div className="grid cards-2">
        <div className="card">
          <h3>1 · Pilih Kurir</h3>
          <div className="pick">
            {couriers.length === 0 ? <span className="muted">Belum ada kurir aktif.</span> :
              couriers.map((c) => <button key={c.id} className={'pill' + (courier === c.id ? ' on' : '')} onClick={() => setCourier(c.id)}>{c.name}</button>)}
          </div>
          <h3>2 · Pilih Pesanan — {sel.size} dipilih · {totalPax} pax</h3>
          {orders.length === 0 ? <div className="muted">Tidak ada pesanan pending.</div> :
            orders.map((o) => (
              <div key={o.id} className={'orow' + (sel.has(o.id) ? ' on' : '')} onClick={() => toggle(o.id)}>
                <div className="cbx">{sel.has(o.id) ? '✓' : ''}</div>
                <div style={{ flex: 1 }}><b>{o.recipient_name}</b><div className="muted">{o.code} · {o.menu_name} · {o.quantity} pax</div></div>
                <span className="muted">{o.food_category}</span>
              </div>
            ))}
          <button className="btn" style={{ marginTop: 14, width: '100%' }} disabled={busy || sel.size === 0} onClick={optimize}>{busy ? 'Memproses…' : '◈ Optimasi Rute (AI)'}</button>
          {err && <div className="err">{err}</div>}
        </div>
        <div className="card">
          <h3>3 · Hasil AI</h3>
          {!result ? <div className="muted">Belum ada hasil. Pilih pesanan lalu klik Optimasi.</div> : (
            <>
              <div className="muted" style={{ marginBottom: 12 }}>Model: <b className="mono" style={{ color: 'var(--goldT)' }}>{result.model_type}</b> · {result.total_distance_km} km · {Math.round(result.total_time_minutes)} min</div>
              {result.route.map((s: any) => (
                <div className="result-step" key={s.sequence}>
                  <span><b className="mono" style={{ color: 'var(--goldT)' }}>{s.sequence}</b>&nbsp; {s.code} · {s.recipient}</span>
                  <span className={'chip r' + s.spoilage_risk[0]}>{s.spoilage_risk}</span>
                </div>
              ))}
              <button className="btn" style={{ marginTop: 16, width: '100%' }} disabled={busy || !courier} onClick={assign}>Kirim ke Kurir →</button>
              {!courier && <div className="muted" style={{ marginTop: 8 }}>Pilih kurir dulu di langkah 1.</div>}
            </>
          )}
          {msg && <div style={{ color: 'var(--success)', marginTop: 12, fontWeight: 600 }}>{msg}</div>}
        </div>
      </div>
    </>
  );
}
