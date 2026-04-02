const isBrowser = typeof window !== "undefined";

// Get API URL from environment or use defaults
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isBrowser
    ? `http://${window.location.hostname}:8080`
    : "http://backend:8080");

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (isBrowser
    ? `ws://${window.location.hostname}:8080/ws`
    : "ws://backend:8080/ws");

export { API_URL, WS_URL };
