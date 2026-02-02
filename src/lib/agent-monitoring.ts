import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const BACKEND_URL = import.meta.env.VITE_MONITORING_URL || 'http://localhost:5000';

export interface AgentStatus {
  agent_id: string;
  anomaly: boolean;
  response_time: number;
  uptime: number;
  score?: number;
}

export function connectMonitoring(callback: (statuses: AgentStatus[]) => void) {
  socket = io(BACKEND_URL);

  socket.on('connect', () => {
    console.log('Monitoring connected');
  });

  socket.on('status_update', (data: AgentStatus) => {
    callback([data]);
  });

  socket.on('model_updated', (data: {agent_id: string, trained_on: number}) => {
    console.log(`Model updated for ${data.agent_id} on ${data.trained_on} points`);
  });

  socket.emit('get_statuses', {agent_ids: []}); // init
}

export function reportMetrics(metrics: Array<{agent_id: string, response_time: number, uptime: number}>) {
  if (socket) {
    fetch(`${BACKEND_URL}/report_metric`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(metrics),
    });
  }
}

export function disconnectMonitoring() {
  socket?.disconnect();
  socket = null;
}
