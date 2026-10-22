import { useCallback, useState } from 'react';
import { cancelOrder } from '@/api/orders';
import { getErrorMessage } from '@/lib/error';
import type { CancellableOrder } from '@/lib/orderRules';

interface UseCancelOrderOptions {
  /** Runs after the server confirms the cancellation */
  onCancelled?: (order: CancellableOrder) => void;
}

export function useCancelOrder({ onCancelled }: UseCancelOrderOptions = {}) {
  const [target, setTarget] = useState<CancellableOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Opens the dialog for this order
  const requestCancel = useCallback((order: CancellableOrder) => {
    setError('');
    setTarget(order);
  }, []);

  const close = useCallback(() => {
    if (loading) return;
    setTarget(null);
    setError('');
  }, [loading]);

  const confirm = useCallback(async () => {
    if (!target) return;

    setLoading(true);
    setError('');
    try {
      await cancelOrder(target.id);
      onCancelled?.(target);
      setTarget(null);
    } catch (err) {
      // The dialog stays open and shows the server message,
      // for example "This order has already been paid and can't be cancelled"
      setError(getErrorMessage(err, 'Failed to cancel order'));
    } finally {
      setLoading(false);
    }
  }, [target, onCancelled]);

  return {
    requestCancel,
    dialogProps: { order: target, loading, error, onConfirm: confirm, onClose: close },
  };
}