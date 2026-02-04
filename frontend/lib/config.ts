// Check if we're running in the browser
const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? window.location.hostname : 'localhost';

export const API_URL = `http://${hostname}:8080`;
export const WS_URL = `ws://${hostname}:8080/ws`;
