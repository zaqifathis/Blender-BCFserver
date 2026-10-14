type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

let socket: WebSocket | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
const listeners = new Set<(connected: boolean) => void>();

function setConnected(connected: boolean) {
  listeners.forEach((l) => l(connected));
}

export function onConnection(cb: (connected: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function connect(): void {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  socket = ws;
  ws.onopen = () => setConnected(true);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string) as { id: number; ok: boolean; data?: unknown; error?: string };
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.data);
    else p.reject(new Error(msg.error ?? "Request failed"));
  };
  ws.onclose = () => {
    setConnected(false);
    pending.forEach((p) => p.reject(new Error("Connection lost")));
    pending.clear();
    setTimeout(connect, 2000); // Blender may have stopped the server; keep trying
  };
}

export function request<T>(type: string, payload: object = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return reject(new Error("Not connected to Blender"));
    const id = nextId++;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    socket.send(JSON.stringify({ id, type, payload }));
  });
}
