import { WS_URL } from "@/lib/config";
import { OnlineUser } from "@/lib/interfaces";

type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
const messageHandlers = new Map<string, MessageHandler[]>();
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;
let isConnecting = false;
let connectionCallbacks: Array<() => void> = [];
let disconnectCallbacks: Array<() => void> = [];

const attemptReconnect = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(
      `Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`,
    );
    setTimeout(() => connect(), reconnectDelay);
  }
};

export const connect = () => {
  if (ws?.readyState === WebSocket.OPEN || isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("WebSocket connected");
      isConnecting = false;
      reconnectAttempts = 0;
      connectionCallbacks.forEach((cb) => cb());
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        const handlers = messageHandlers.get(data.type) || [];
        console.log(`Found ${handlers.length} handlers for type: ${data.type}`);
        handlers.forEach((handler) => handler(data));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      isConnecting = false;
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      isConnecting = false;
      disconnectCallbacks.forEach((cb) => cb());
      attemptReconnect();
    };
  } catch (error) {
    console.error("Failed to connect to WebSocket:", error);
    isConnecting = false;
    attemptReconnect();
  }
};

export const disconnect = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  messageHandlers.clear();
  connectionCallbacks = [];
  disconnectCallbacks = [];
};

export const on = (messageType: string, handler: MessageHandler) => {
  if (!messageHandlers.has(messageType)) {
    messageHandlers.set(messageType, []);
  }
  messageHandlers.get(messageType)!.push(handler);
};

export const off = (messageType: string, handler: MessageHandler) => {
  const handlers = messageHandlers.get(messageType);
  if (handlers) {
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
};

export const onConnect = (callback: () => void) => {
  connectionCallbacks.push(callback);
};

export const onDisconnect = (callback: () => void) => {
  disconnectCallbacks.push(callback);
};

export const send = (data: any) => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  } else {
    console.warn("WebSocket is not connected");
  }
};

export const isConnected = (): boolean => {
  return ws?.readyState === WebSocket.OPEN;
};
