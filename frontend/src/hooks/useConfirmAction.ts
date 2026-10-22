import { useCallback, useState } from 'react';
import { getErrorMessage } from '@/lib/error';

interface UseConfirmActionOptions<T> {
  action: (item: T) => Promise<void>;
  onSuccess?: (item: T) => void;
  fallbackError?: string;
}

export function useConfirmAction<T>({
  action,
  onSuccess,
  fallbackError = 'Something went wrong',
}: UseConfirmActionOptions<T>) {
  const [target, setTarget] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const request = useCallback((item: T) => {
    setError('');
    setTarget(item);
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
      await action(target);
      onSuccess?.(target);
      setTarget(null);
    } catch (err) {
      setError(getErrorMessage(err, fallbackError));
    } finally {
      setLoading(false);
    }
  }, [target, action, onSuccess, fallbackError]);

  return { target, request, close, confirm, loading, error };
}