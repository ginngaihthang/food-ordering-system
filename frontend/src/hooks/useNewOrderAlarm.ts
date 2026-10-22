import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

const SOUND_URL = '/sounds/new_order.mp3';

export function useNewOrderAlarm(paused: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // Refs so the socket handler always sees the latest values
  const enabledRef = useRef(enabled);
  const pausedRef = useRef(paused);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const audio = new Audio(SOUND_URL);
    audio.preload = 'auto';
    audioRef.current = audio;

    const socket = getSocket();

    // Rooms are lost when the socket reconnects, so join on every connect
    function joinAdminRoom() {
      socket.emit('join_admin_room');
    }

    function handleNewOrder() {
      if (!enabledRef.current || pausedRef.current) return;
      setNewCount((c) => c + 1);
      audio.loop = true; // keeps ringing until someone clicks the red button
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch((err) => console.warn('Alarm blocked:', err));
      }
    }

    if (socket.connected) joinAdminRoom();
    socket.on('connect', joinAdminRoom);
    socket.on('new_order', handleNewOrder);

    return () => {
      socket.off('connect', joinAdminRoom);
      socket.off('new_order', handleNewOrder);
      audio.pause();
      audio.loop = false;
    };
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.loop = false;
    audio.currentTime = 0;
  }, []);

  // Clicking is what lets the browser play sound, so enabling always needs a click
  const enable = useCallback(() => {
    setEnabled(true);
    const audio = audioRef.current;
    if (audio) {
      audio.loop = false;
      audio.currentTime = 0;
      audio.play().catch(() => {}); // one-time preview chime
    }
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
    setNewCount(0);
    stopAudio();
  }, [stopAudio]);

  // Staff clicked the red button: stop ringing and clear the counter
  const acknowledge = useCallback(() => {
    setNewCount(0);
    stopAudio();
  }, [stopAudio]);

  return {
    enabled,
    ringing: enabled && newCount > 0,
    newCount,
    enable,
    disable,
    acknowledge,
  };
}