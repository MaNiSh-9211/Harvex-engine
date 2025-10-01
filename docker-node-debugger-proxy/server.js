import WebSocket, { WebSocketServer } from 'ws';
import fetch from 'node-fetch';
import { log } from './utils/logger.js';

const NODE_INSPECTOR_HOST = 'localhost';
const NODE_INSPECTOR_PORT = 9269;

// Fetch active Node Inspector WebSocket URL from Docker container
async function getInspectorWebSocketUrl() {
  const res = await fetch(`http://${NODE_INSPECTOR_HOST}:${NODE_INSPECTOR_PORT}/json`);
  const data = await res.json();
  if (!data[0] || !data[0].webSocketDebuggerUrl) {
    throw new Error('No WebSocket URL found from Node Inspector');
  }
  return data[0].webSocketDebuggerUrl;
}

const wss = new WebSocketServer({ port: 8080 }, () => {
  log('WebSocket Debug Proxy server running on ws://localhost:8080');
});

wss.on('connection', async (client) => {
  log('CLI client connected');

  let nodeSocketUrl;
  try {
    nodeSocketUrl = await getInspectorWebSocketUrl();
    log('Connecting to Node Inspector at:', nodeSocketUrl);
  } catch (err) {
    log('Failed to fetch Node Inspector URL:', err.message);
    client.send(JSON.stringify({ error: err.message }));
    return;
  }

  const nodeWs = new WebSocket(nodeSocketUrl);

  nodeWs.on('open', () => {
    log('Connected to Node Inspector');
  });

  nodeWs.on('message', (msg) => {
    // Forward all Node Inspector messages to CLI client
    client.send(msg.toString());
  });

  nodeWs.on('close', () => {
    log('Node Inspector connection closed');
  });

  nodeWs.on('error', (err) => {
    log('Node Inspector WebSocket error:', err.message);
  });

  client.on('message', (msg) => {
    // Forward CLI commands to Node Inspector
    log('Command from CLI:', msg.toString());
    nodeWs.send(msg.toString());
  });

  client.on('close', () => {
    log('CLI client disconnected');
    nodeWs.close();
  });
});
