import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('owner@bahagia.id');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch (e: any) { setErr(e.message || 'Gagal masuk.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="lb">LogiEat OS</div>
        <div className="sub">Dashboard web — Go REST API + React</div>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Kata sandi</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        {err && <div className="err">{err}</div>}
        <div className="hint">Demo: owner@bahagia.id / password · budi@bahagia.id / password</div>
      </form>
    </div>
  );
}
