import { useSyncExternalStore } from 'react';
import { getSocket } from '@/lib/socket';

function subscribe(onChange: () => void): () => void {
  const socket = getSocket();
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);

  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}

function getSnapshot(): boolean {
  return getSocket().connected;
}

export function useSocketStatus(): boolean {
  // The last argument is only used when rendering on a server
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}