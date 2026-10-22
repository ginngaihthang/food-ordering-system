import { useCallback, useEffect, useState } from 'react';
import { fetchTableSession, closeTableSession } from '@/api/tables';
import type { TableSessionResult } from '@/types/table';
import { getSocket } from '@/lib/socket';

export function useTableSession() {
  const [sessionData, setSessionData] = useState<TableSessionResult | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [activeTableId, setActiveTableId] = useState<number | null>(null);

  const loadSession = useCallback(async (tableId: number) => {
    setLoadingSession(true);
    setActiveTableId(tableId);
    const data = await fetchTableSession(tableId);
    setSessionData(data);
    setLoadingSession(false);
  }, []);


  async function closeSession(tableId: number) {
    await closeTableSession(tableId);
    setSessionData(null);
    setActiveTableId(null);
  }

   useEffect(() => {
    if (!activeTableId) return;

    const socket = getSocket();

    function handleOrderUpdated() {
      if (activeTableId) {
        loadSession(activeTableId);
      }
    }

    socket.on('order_updated', handleOrderUpdated);
    socket.on('order_status_updated', handleOrderUpdated);

    return () => {
      socket.off('order_updated', handleOrderUpdated);
      socket.off('order_status_updated', handleOrderUpdated);
    };
  }, [activeTableId, loadSession]);

  return { sessionData, loadingSession, loadSession, closeSession };
}