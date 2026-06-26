// Realtime WebSocket singleton (GPS + chat). Auto-reconnects.
import { getToken } from './api';
import { config } from './config';

export type WsMessage = { type: string; [k: string]: any };
type Handler = (m: WsMessage) => void;

class Realtime {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private closed = false;

  async connect() {
    if (this.ws) return;
    const token = await getToken();
    if (!token) return;
    this.closed = false;
    const sock = new WebSocket(`${config.wsUrl}?token=${token}`);
    this.ws = sock;
    sock.onmessage = (e: any) => {
      try {
        const m = JSON.parse(e.data);
        this.handlers.forEach((h) => h(m));
      } catch {}
    };
    sock.onclose = () => {
      this.ws = null;
      if (!this.closed) setTimeout(() => this.connect(), 2000);
    };
    sock.onerror = () => {};
  }

  on(fn: Handler) {
    this.handlers.add(fn);
    return () => { this.handlers.delete(fn); };
  }

  send(msg: WsMessage) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}

export const realtime = new Realtime();
