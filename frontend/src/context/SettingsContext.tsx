import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchSettings, saveSettings } from '@/api/settings';
import { defaultSettings, type Settings } from '@/types/settings';

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Formats an amount with the restaurant's currency symbol, e.g. money(6.5) -> "$6.50" */
  money: (amount: number | string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await saveSettings(patch));
  }, []);

  const money = useCallback(
    (amount: number | string) =>
      `${settings.currencySymbol}${(Number(amount) || 0).toFixed(2)}`,
    [settings.currencySymbol]
  );

  const value = useMemo(
    () => ({ settings, loading, updateSettings, money }),
    [settings, loading, updateSettings, money]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}