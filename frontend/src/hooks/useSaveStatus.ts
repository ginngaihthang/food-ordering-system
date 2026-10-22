import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/error';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useSaveStatus() {
  const [status, setStatus] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Runs the action and tracks saving / saved / error. Resolves to true on success.
  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    window.clearTimeout(timer.current);
    setStatus('saving');
    setError('');
    try {
      await action();
      setStatus('saved');
      timer.current = window.setTimeout(() => setStatus('idle'), 2000);
      return true;
    } catch (err) {
      setStatus('error');
      setError(getErrorMessage(err, 'Failed to save'));
      return false;
    }
  }, []);

  return { status, error, run };
}