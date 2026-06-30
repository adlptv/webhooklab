import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.WS_PORT || '3001', 10);

let wss: WebSocketServer | null = null;

const endpointClients = new Map<string, Set<WebSocket>>();

export function getWSS(): WebSocketServer | null {
  return wss;
}

export function initWebSocketServer(): WebSocketServer {
  if (wss) return wss;

  wss = new WebSocketServer({ port: PORT });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://localhost:${PORT}`);
    const endpointId = url.searchParams.get('endpointId');

    if (!endpointId) {
      ws.close(1008, 'Missing endpointId');
      return;
    }

    if (!endpointClients.has(endpointId)) {
      endpointClients.set(endpointId, new Set());
    }
    endpointClients.get(endpointId)!.add(ws);

    ws.send(JSON.stringify({ type: 'connected', endpointId }));

    ws.on('close', () => {
      const clients = endpointClients.get(endpointId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          endpointClients.delete(endpointId);
        }
      }
    });

    ws.on('error', () => {
      const clients = endpointClients.get(endpointId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          endpointClients.delete(endpointId);
        }
      }
    });
  });

  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  return wss;
}

export function broadcastToEndpoint(endpointId: string, message: unknown): void {
  const clients = endpointClients.get(endpointId);
  if (!clients || clients.size === 0) return;

  const data = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}
