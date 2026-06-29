import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const rp = (v: number) => 'Rp ' + Number(v).toLocaleString('id-ID');

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.analytics().then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <div className="muted">Gagal memuat: {err}</div>;
  if (!d) return <div className="spinner" />;

  const k = d.kpis;
  const months: any[] = d.trend.month;
  const maxSales = Math.max(...months.map((m) => m.sales), 1);
  const maxKm = Math.max(...d.couriers.map((c: any) => c.km), 1);

  return (
    <>
      <div className="page-h"><div><h1>Dashboard</h1><p>Ringkasan operasional katering</p></div></div>
      <div className="grid kpis">
        <KPI l="Penjualan Hari Ini" v={rp(k.sales_today)} />
        <KPI l="Pesanan Hari Ini" v={k.orders_today} />
        <KPI l="Total Terkirim" v={k.deliveries} />
        <KPI l="On-Time" v={k.on_time_pct + '%'} />
      </div>
      <div className="grid cards-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Tren Penjualan · 12 Bulan</h3>
          <div className="bars">
            {months.map((m, i) => (
              <div key={i} className="bar" style={{ height: Math.max(3, (m.sales / maxSales) * 150) }} title={`${m.month}: ${rp(m.sales)}`} />
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Rekap Kurir · jarak tempuh</h3>
          {d.couriers.length === 0 ? <div className="muted">Belum ada data kurir.</div> :
            d.couriers.map((c: any, i: number) => (
              <div className="kmrow" key={i}>
                <span className="nm">{c.name}</span>
                <div className="track"><div className="fill" style={{ width: `${(c.km / maxKm) * 100}%` }} /></div>
                <span className="v mono">{c.km}km</span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

function KPI({ l, v }: { l: string; v: any }) {
  return <div className="card kpi"><div className="l">{l}</div><div className="v">{v}</div></div>;
}
