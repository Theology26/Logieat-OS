import { BASE, getToken } from './api';

// Subscribe to the Go realtime channel (fleet GPS + chat). Auto-reconnects.
export function connectWs(onMsg: (m: any) => void): () => void {
  let sock: WebSocket | null = null;
  let closed = false;
  const url = BASE.replace(/^http/, 'ws') + '/ws?token=' + getToken();

  const open = () => {
    sock = new WebSocket(url);
    sock.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch {} };
    sock.onclose = () => { if (!closed) setTimeout(open, 2000); };
  };
  open();
  return () => { closed = true; sock?.close(); };
}
