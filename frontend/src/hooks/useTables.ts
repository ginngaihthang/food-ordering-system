import { useCallback, useEffect, useState } from 'react';
import { createTable, deleteTable, fetchTables, regenerateQrToken } from '@/api/tables';
import { getSocket } from '@/lib/socket';
import type { RestaurantTable } from '@/types/table';

export function useTables() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

 // Never switches back to the loading skeleton, so live refreshes don't flash
  const loadData = useCallback(async () => {
    try {
      setTables(await fetchTables());
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  let cancelled = false;

  fetchTables()
    .then((data) => {
      if (!cancelled) setTables(data);
    })
    .catch((err) => console.error('Failed to load tables:', err))
    .finally(() => {
      if (!cancelled) setLoading(false);
    });

  return () => {
    cancelled = true;
  };
}, []);

  // Totals and statuses change when orders arrive or move on, and when a bill is paid or closed
  useEffect(() => {
    const socket = getSocket();

    const refresh = () => {
      void loadData();
    };
    const handleConnect = () => {
      socket.emit('join_admin_room');
      void loadData(); // catch up after a dropped connection
    };

    if (socket.connected) socket.emit('join_admin_room');
    socket.on('connect', handleConnect);
    socket.on('new_order', refresh);
    socket.on('order_updated', refresh);
    socket.on('tables_changed', refresh);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_order', refresh);
      socket.off('order_updated', refresh);
      socket.off('tables_changed', refresh);
    };
  }, [loadData]);

  const addTable = useCallback(
    async (tableNumber: number) => {
      await createTable(tableNumber);
      await loadData();
    },
    [loadData]
  );

  const removeTable = useCallback(
    async (id: number) => {
      await deleteTable(id);
      await loadData();
    },
    [loadData]
  );

  const regenerateTableQr = useCallback(
    async (id: number) => {
      const updated = await regenerateQrToken(id);
      await loadData();
      return updated;
    },
    [loadData]
  );

  return { tables, loading, loadData, addTable, removeTable, regenerateTableQr };
}