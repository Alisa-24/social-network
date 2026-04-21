import { WS_URL } from "@/lib/config";

type MessageHandler = (data: unknown) => void;
type MaxRetriesCallback = () => void;
type ConnectionErrorCallback = (error: Event) => void;
type ReconnectAttemptCallback = (
  attempt: number,
  maxAttempts: number,
) => void;

let ws: WebSocket | null = null;
const messageHandlers = new Map<string, MessageHandler[]>();

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;

let isConnecting = false;
let manuallyClosed = false;

let connectionCallbacks: Array<() => void> = [];
let disconnectCallbacks: Array<() => void> = [];
let maxRetriesCallbacks: Array<MaxRetriesCallback> = [];
let connectionErrorCallbacks: Array<ConnectionErrorCallback> = [];
let reconnectAttemptCallbacks: Array<ReconnectAttemptCallback> = [];

const removeCallback = <T>(callbacks: T[], callback: T) => {
  const index = callbacks.indexOf(callback);
  if (index !== -1) {
    callbacks.splice(index, 1);
  }
};

const attemptReconnect = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(
      `Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`
    );
    reconnectAttemptCallbacks.forEach((cb) =>
      cb(reconnectAttempts, maxReconnectAttempts),
    );
    setTimeout(connect, reconnectDelay);
  } else {
    console.error("Max reconnection attempts reached");
    maxRetriesCallbacks.forEach((cb) => cb());
  }
};

export const connect = () => {
  if (ws?.readyState === WebSocket.OPEN || isConnecting) return;

  manuallyClosed = false;
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
        if (!data || typeof data.type !== "string") {
          console.warn("Ignoring invalid WebSocket payload", data);
          return;
        }
        const handlers = messageHandlers.get(data.type) || [];
        handlers.forEach((handler) => handler(data));
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      isConnecting = false;
      connectionErrorCallbacks.forEach((cb) => cb(error));
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      isConnecting = false;
      disconnectCallbacks.forEach((cb) => cb());

      if (!manuallyClosed) {
        attemptReconnect();
      }
    };
  } catch (error) {
    console.error("Failed to connect to WebSocket:", error);
    isConnecting = false;
    attemptReconnect();
  }
};

export const disconnect = () => {
  manuallyClosed = true;
  ws?.close();
  ws = null;

  messageHandlers.clear();
  connectionCallbacks = [];
  disconnectCallbacks = [];
  maxRetriesCallbacks = [];
  connectionErrorCallbacks = [];
  reconnectAttemptCallbacks = [];
};

export const on = (messageType: string, handler: MessageHandler) => {
  if (!messageHandlers.has(messageType)) {
    messageHandlers.set(messageType, []);
  }
  messageHandlers.get(messageType)!.push(handler);
};

export const off = (messageType: string, handler: MessageHandler) => {
  const handlers = messageHandlers.get(messageType);
  if (!handlers) return;

  const index = handlers.indexOf(handler);
  if (index !== -1) handlers.splice(index, 1);
};

export const onConnect = (callback: () => void) => {
  connectionCallbacks.push(callback);
};

export const offConnect = (callback: () => void) => {
  removeCallback(connectionCallbacks, callback);
};

export const onDisconnect = (callback: () => void) => {
  disconnectCallbacks.push(callback);
};

export const offDisconnect = (callback: () => void) => {
  removeCallback(disconnectCallbacks, callback);
};

export const onMaxRetriesReached = (callback: MaxRetriesCallback) => {
  maxRetriesCallbacks.push(callback);
};

export const offMaxRetriesReached = (callback: MaxRetriesCallback) => {
  removeCallback(maxRetriesCallbacks, callback);
};

export const onError = (callback: ConnectionErrorCallback) => {
  connectionErrorCallbacks.push(callback);
};

export const offError = (callback: ConnectionErrorCallback) => {
  removeCallback(connectionErrorCallbacks, callback);
};

export const onReconnectAttempt = (callback: ReconnectAttemptCallback) => {
  reconnectAttemptCallbacks.push(callback);
};

export const offReconnectAttempt = (callback: ReconnectAttemptCallback) => {
  removeCallback(reconnectAttemptCallbacks, callback);
};

export const send = (data: Record<string, unknown>) => {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
};

export const isConnected = (): boolean => {
  return ws?.readyState === WebSocket.OPEN;
};

export const getReconnectAttempts = () => reconnectAttempts;
export const getMaxReconnectAttempts = () => maxReconnectAttempts;

export const requestOnlineUsers = () => {
  send({ type: "get_online_users" });
};
