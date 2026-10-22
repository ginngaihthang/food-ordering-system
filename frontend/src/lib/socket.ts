import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL, {
      // Read on every (re)connect, so a fresh login is picked up
      auth: (cb) => cb({ token: localStorage.getItem('admin_token') }),
    });
  }
  return socket;
}

// Call after login and logout so the next connection uses the right account
export function resetSocket(): void {
  socket?.disconnect();
  socket = null;
}