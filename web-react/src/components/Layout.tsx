import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV = [
  ['/', 'Dashboard', '◉'],
  ['/orders', 'Pesanan', '▤'],
  ['/dispatch', 'Dispatch AI', '➤'],
  ['/fleet', 'Armada Live', '◎'],
];

export default function Layout() {
  const { user, company, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">LogiEat OS<small>GO · REACT · REST API</small></div>
        {NAV.map(([to, label, ic]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span className="ic">{ic}</span>{label}
          </NavLink>
        ))}
        <div className="side-foot">
          <b>{user?.name}</b>
          {company?.name} · {user?.role}
          <button className="logout" onClick={() => { logout(); nav('/login'); }}>Keluar</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
